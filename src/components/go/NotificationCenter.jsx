import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, X, Info, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  useFocusTrap(dropdownRef, open);

  const load = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const notifs = await base44.entities.AppNotification.filter(
        { user_email: user.email },
        '-created_date',
        20
      );
      setNotifications(notifs || []);
      setUnread((notifs || []).filter(n => !n.read).length);
    } catch {
      // silent fail
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Show browser notification when app is open
  useEffect(() => {
    if (!open && notifications.length > 0) {
      const latest = notifications[0];
      if (!latest.read && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(latest.title, { body: latest.body });
        } catch {}
      }
    }
  }, [notifications, open]);

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => { requestPermission(); }, []);

  const markRead = async (id) => {
    const prevNotifs = notifications;
    const prevUnread = unread;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
    try {
      await base44.entities.AppNotification.update(id, { read: true });
    } catch {
      setNotifications(prevNotifs);
      setUnread(prevUnread);
    }
  };

  const markAllRead = async () => {
    const prevNotifs = notifications;
    const prevUnread = unread;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnread(0);
    const unreadNotifs = prevNotifs.filter(n => !n.read);
    let failed = false;
    for (const n of unreadNotifs) {
      try { await base44.entities.AppNotification.update(n.id, { read: true }); } catch { failed = true; }
    }
    if (failed) {
      setNotifications(prevNotifs);
      setUnread(prevUnread);
    }
  };

  const handleClick = (notif) => {
    if (!notif.read) markRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const iconMap = {
    info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    success: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    alert: { icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
    job: { icon: Package, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  };
  const defaultIcon = iconMap.info;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative min-h-[44px] min-w-[44px]"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            role="presentation"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } }}
          />
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="absolute right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)] bg-card border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-display font-bold text-sm">Notifications</h3>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline min-h-[44px] px-3">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                notifications.map(n => {
                  const cfg = iconMap[n.type] || defaultIcon;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? 'bg-emerald-500/5' : ''}`}
                    >
                      <div className={`rounded-lg p-1.5 shrink-0 ${cfg.bg}`}>
                        <Icon className={cfg.color} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}