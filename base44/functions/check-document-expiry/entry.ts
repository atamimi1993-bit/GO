import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Checks all approved drivers for expiring/expired licenses and sends email alerts.
// Triggered weekly by the DocumentExpiryAlerts workflow.
//   - 8-30 days out: friendly reminder to driver
//   - 1-7 days out: urgent reminder to driver + admin notification
//   - Expired: suspend driver + admin notification
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.DriverProfile.filter({
      status: 'approved',
    }, '-created_date', 500);

    const now = new Date();
    const alerts = { reminders: 0, urgent: 0, suspended: 0, skipped: 0 };
    const adminAlerts = [];

    for (const driver of drivers) {
      if (!driver.license_expiry) { alerts.skipped++; continue; }

      const expiry = new Date(driver.license_expiry + 'T23:59:59');
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil > 30) { alerts.skipped++; continue; }

      const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Already expired — suspend and notify admin
      if (daysUntil < 0) {
        try {
          await base44.asServiceRole.entities.DriverProfile.update(driver.id, {
            status: 'suspended',
            available: false,
          });
          alerts.suspended++;
          adminAlerts.push({
            name: driver.full_name,
            email: driver.email,
            phone: driver.phone,
            license_expiry: driver.license_expiry,
            status: 'EXPIRED — driver suspended',
          });
        } catch (e) {
          console.error('Failed to suspend driver ' + driver.id + ':', e.message);
        }

        if (driver.email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: driver.email,
              subject: 'ACTION REQUIRED: Your driver license has expired',
              body: [
                '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">',
                '<h2 style="color:#dc2626;">Your license has expired</h2>',
                `<p>Your driver's license expired on <strong>${fmtDate(expiry)}</strong>. Your account has been suspended and you will not receive new job assignments.</p>`,
                '<p>To reactivate your account, please renew your license and update it in the Driver Hub.</p>',
                '</div>',
              ].join('\n'),
            });
          } catch (e) {
            console.error('Failed to email driver ' + driver.email + ':', e.message);
          }
        }
        continue;
      }

      // Determine urgency
      const isUrgent = daysUntil <= 7;
      if (isUrgent) alerts.urgent++; else alerts.reminders++;

      if (driver.email) {
        try {
          const subject = isUrgent
            ? `URGENT: Your license expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
            : `Reminder: Your license expires on ${fmtDate(expiry)}`;

          const headingColor = isUrgent ? '#dc2626' : '#f59e0b';
          const heading = isUrgent
            ? `Your license expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
            : `Your license expires on ${fmtDate(expiry)}`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: driver.email,
            subject,
            body: [
              '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">',
              `<h2 style="color:${headingColor};">${heading}</h2>`,
              `<p>This is a friendly reminder that your driver's license will expire on <strong>${fmtDate(expiry)}</strong>.</p>`,
              isUrgent
                ? '<p style="background:#fef3c7;border-radius:8px;padding:12px;color:#92400e;">Please renew your license as soon as possible. After it expires, your account will be suspended and you will stop receiving jobs.</p>'
                : '<p>Please plan to renew your license before it expires to avoid any interruption in your ability to accept jobs.</p>',
              '<p>Once renewed, update your license information in the Driver Hub.</p>',
              '</div>',
            ].join('\n'),
          });
        } catch (e) {
          console.error('Failed to email driver ' + driver.email + ':', e.message);
        }
      }

      // Notify admins for urgent cases
      if (isUrgent) {
        adminAlerts.push({
          name: driver.full_name,
          email: driver.email,
          phone: driver.phone,
          license_expiry: driver.license_expiry,
          status: `EXPIRES IN ${daysUntil} DAY${daysUntil === 1 ? '' : 'S'}`,
        });
      }
    }

    // Send a summary email to admins
    if (adminAlerts.length > 0) {
      try {
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          if (!admin.email) continue;
          const rows = adminAlerts.map(a =>
            `<tr><td style="padding:6px;border:1px solid #e5e7eb;">${a.name}</td><td style="padding:6px;border:1px solid #e5e7eb;">${a.email}</td><td style="padding:6px;border:1px solid #e5e7eb;">${a.phone || 'N/A'}</td><td style="padding:6px;border:1px solid #e5e7eb;">${a.license_expiry}</td><td style="padding:6px;border:1px solid #e5e7eb;font-weight:bold;color:${a.status.includes('EXPIRED') ? '#dc2626' : '#f59e0b'};">${a.status}</td></tr>`
          ).join('');
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: `Driver Compliance Alert: ${adminAlerts.length} driver${adminAlerts.length === 1 ? '' : 's'} need attention`,
            body: [
              '<div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">',
              '<h2>Weekly Compliance Report</h2>',
              `<p>${adminAlerts.length} driver${adminAlerts.length === 1 ? ' has' : 's have'} a license expiring soon or already expired.</p>`,
              '<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">',
              '<tr style="background:#f3f4f6;"><th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Name</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Email</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Phone</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Expiry</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left;">Status</th></tr>',
              rows,
              '</table>',
              '<p style="color:#6b7280;font-size:14px;">Expired drivers have been automatically suspended. Expiring drivers have been emailed a reminder.</p>',
              '</div>',
            ].join('\n'),
          });
        }
      } catch (e) {
        console.error('Failed to notify admins:', e.message);
      }
    }

    return Response.json({
      checked: drivers.length,
      ...alerts,
      admin_alerts: adminAlerts.length,
    });
  } catch (error) {
    console.error('check-document-expiry error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});