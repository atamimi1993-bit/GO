import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// US DST check — true between 2nd Sunday March and 1st Sunday November (approx)
function isEasternDST(month, day) {
  if (month < 3 || month > 11) return false;
  if (month === 3 && day < 9) return false;
  if (month === 11 && day > 7) return false;
  return true;
}

// Parses move_date (YYYY-MM-DD) + move_time string into a UTC Date,
// interpreting the time as America/New_York local time.
function parseMoveDateTimeET(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  if (!y || !mo || !d) return null;

  let h = 9, mi = 0;
  if (timeStr) {
    const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (m) {
      h = parseInt(m[1]);
      mi = parseInt(m[2]);
      const p = (m[3] || '').toUpperCase();
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
    } else {
      const lower = timeStr.toLowerCase();
      if (lower.includes('morning')) h = 9;
      else if (lower.includes('noon') || lower.includes('midday')) h = 12;
      else if (lower.includes('afternoon')) h = 13;
      else if (lower.includes('evening')) h = 17;
    }
  }

  const offset = isEasternDST(mo, d) ? 4 : 5; // ET = UTC-4 (DST) or UTC-5
  return new Date(Date.UTC(y, mo - 1, d, h + offset, mi));
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Sends a reminder to the customer via email + in-app notification
async function sendCustomerReminder(base44, move, type) {
  if (!move.customer_email) return;

  const is24h = type === '24h';
  const moveDateStr = formatDate(move.move_date);
  const driverName = move.assigned_driver_name || 'your assigned driver';

  const headline = is24h
    ? 'Your move is tomorrow! 📦'
    : 'Your move starts soon! 🚚';
  const message = is24h
    ? `This is a friendly reminder that your move is scheduled for tomorrow. Your driver ${driverName} will meet you at your pickup location. Please ensure your items are packed and ready.`
    : `Your move is starting in about an hour. Your driver ${driverName} will arrive at your pickup location shortly. Please make sure someone is available at the pickup address.`;

  const detailRows = [
    moveDateStr ? ['Move Date', moveDateStr] : null,
    move.move_time ? ['Move Time', move.move_time] : null,
    move.pickup_address ? ['Pickup', move.pickup_address] : null,
    move.dropoff_address ? ['Drop-off', move.dropoff_address] : null,
    ['Driver', driverName],
  ].filter(Boolean);

  const htmlBody = [
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
    `<p>${move.customer_name ? 'Hi ' + move.customer_name.split(' ')[0] + ',' : 'Hello,'}</p>`,
    `<h2 style="margin:8px 0 4px;color:#16a34a;">${headline}</h2>`,
    `<p style="color:#4b5563;">${message}</p>`,
    `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${detailRows
      .map(([label, value]) =>
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:120px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
      ).join('')}</table>`,
    `<p style="margin-top:24px;color:#4b5563;">Open your app to view full move details and track your driver's location in real time.</p>`,
    `</div>`,
  ].join('\n');

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: move.customer_email,
      subject: `${headline} — ${move.pickup_address || 'Pickup'}`,
      body: htmlBody,
    });
  } catch (err) {
    console.error(`Failed to email customer ${move.customer_email}:`, err.message);
  }

  try {
    await base44.asServiceRole.entities.AppNotification.create({
      user_email: move.customer_email,
      title: headline,
      body: message,
      type: is24h ? 'info' : 'alert',
      read: false,
      link: move.id ? `/move/${move.id}` : null,
      icon: 'clock',
    });
  } catch (notifErr) {
    console.error('Failed to create customer in-app reminder:', notifErr.message);
  }
}

// Sends a reminder to the assigned driver via email + in-app notification
async function sendDriverReminder(base44, move, driver, type) {
  if (!driver || !driver.email) return;

  const is24h = type === '24h';
  const moveDateStr = formatDate(move.move_date);
  const customerName = move.customer_name || 'Customer';
  const customerPhone = move.customer_phone || 'N/A';

  const headline = is24h
    ? 'Move tomorrow — get ready! 📦'
    : 'Move starting soon — head to pickup! 🚚';
  const message = is24h
    ? `You have a move scheduled for tomorrow. Please review the details below and ensure your truck is ready, fueled, and available for the scheduled time.`
    : `Your move is starting in about an hour. Please head to the pickup location now to ensure you arrive on time.`;

  const detailRows = [
    moveDateStr ? ['Move Date', moveDateStr] : null,
    move.move_time ? ['Move Time', move.move_time] : null,
    ['Customer', customerName],
    ['Customer Phone', customerPhone],
    move.pickup_address ? ['Pickup', move.pickup_address] : null,
    move.dropoff_address ? ['Drop-off', move.dropoff_address] : null,
    move.items_summary ? ['Items', move.items_summary] : null,
  ].filter(Boolean);

  const htmlBody = [
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937;">`,
    `<p>Hi ${driver.full_name?.split(' ')[0] || 'Driver'},</p>`,
    `<h2 style="margin:8px 0 4px;color:#16a34a;">${headline}</h2>`,
    `<p style="color:#4b5563;">${message}</p>`,
    `<table style="width:100%;border-collapse:collapse;margin:20px 0;">${detailRows
      .map(([label, value]) =>
        `<tr><td style="padding:8px 0;font-weight:bold;color:#6b7280;width:140px;">${label}</td><td style="padding:8px 0;">${value}</td></tr>`
      ).join('')}</table>`,
    `<p style="margin-top:24px;color:#4b5563;">Open your driver dashboard to view the full move details, navigate to the pickup, and mark your status.</p>`,
    `</div>`,
  ].join('\n');

  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: driver.email,
      subject: `${headline} — ${move.pickup_address || 'Pickup'} → ${move.dropoff_address || 'Dropoff'}`,
      body: htmlBody,
    });
  } catch (err) {
    console.error(`Failed to email driver ${driver.email}:`, err.message);
  }

  try {
    await base44.asServiceRole.entities.AppNotification.create({
      user_email: driver.email,
      title: headline,
      body: `${message} Pickup: ${move.pickup_address || 'N/A'}. Customer: ${customerName}.`,
      type: 'job',
      read: false,
      link: move.id ? `/move/${move.id}` : null,
      icon: 'truck',
    });
  } catch (notifErr) {
    console.error('Failed to create driver in-app reminder:', notifErr.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Require auth — allows admin users or workflow (service-role) invocations
    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const now = new Date();

    // Find accepted or in_progress moves that have a move date
    const moves = await base44.asServiceRole.entities.MoveRequest.filter({
      status: { $in: ['accepted', 'in_progress'] },
    });

    const results = {
      checked: moves.length,
      reminders_24h_sent: 0,
      reminders_1h_sent: 0,
      skipped_no_date: 0,
      skipped_past: 0,
    };

    for (const move of moves) {
      if (!move.move_date) {
        results.skipped_no_date++;
        continue;
      }

      const moveDateTime = parseMoveDateTimeET(move.move_date, move.move_time);
      if (!moveDateTime) {
        results.skipped_no_date++;
        continue;
      }

      const hoursUntil = (moveDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Skip if move is already in the past
      if (hoursUntil < 0) {
        results.skipped_past++;
        continue;
      }

      // 24-hour reminder: within 24h, more than 1h away, not yet sent
      if (hoursUntil <= 24 && hoursUntil > 1 && !move.reminder_24h_sent) {
        await sendCustomerReminder(base44, move, '24h');

        // Send to driver if one is assigned
        if (move.assigned_driver_id) {
          try {
            const driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
            if (driver) {
              await sendDriverReminder(base44, move, driver, '24h');
            }
          } catch (driverErr) {
            console.error('Failed to fetch driver for 24h reminder:', driverErr.message);
          }
        }

        await base44.asServiceRole.entities.MoveRequest.update(move.id, { reminder_24h_sent: true });
        results.reminders_24h_sent++;
      }

      // 1-hour reminder: within 1h, not yet sent
      if (hoursUntil <= 1 && hoursUntil > 0 && !move.reminder_1h_sent) {
        await sendCustomerReminder(base44, move, '1h');

        if (move.assigned_driver_id) {
          try {
            const driver = await base44.asServiceRole.entities.DriverProfile.get(move.assigned_driver_id);
            if (driver) {
              await sendDriverReminder(base44, move, driver, '1h');
            }
          } catch (driverErr) {
            console.error('Failed to fetch driver for 1h reminder:', driverErr.message);
          }
        }

        await base44.asServiceRole.entities.MoveRequest.update(move.id, { reminder_1h_sent: true });
        results.reminders_1h_sent++;
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('notify-upcoming-move error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});