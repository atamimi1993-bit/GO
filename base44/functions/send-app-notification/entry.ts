import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates an in-app notification for a user. Can be called from other backend
// functions or workflows to alert users about events (job assignments, payment
// updates, dispatch offers, etc.).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const isAuth = await base44.auth.isAuthenticated().catch(() => false);
    if (!isAuth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_email, title, body: notifBody, type, link, icon } = body;

    if (!user_email || !title || !notifBody) {
      return Response.json({ error: 'user_email, title, and body are required' }, { status: 400 });
    }

    const notification = await base44.asServiceRole.entities.AppNotification.create({
      user_email,
      title,
      body: notifBody,
      type: type || 'info',
      read: false,
      link: link || null,
      icon: icon || null,
    });

    return Response.json({ success: true, id: notification.id });
  } catch (error) {
    console.error('send-app-notification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});