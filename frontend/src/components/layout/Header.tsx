import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Notification } from '../../types';
import toast, { Toaster } from 'react-hot-toast';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number>(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      const newNotifs: Notification[] = notifRes.data || [];
      const newCount: number = countRes.data.count || 0;

      setNotifications(newNotifs);
      setUnreadCount(newCount);

      // Show popup for new notifications (skip initial load)
      if (!isFirstLoad.current && newCount > prevUnreadRef.current) {
        const latestUnread = newNotifs.find((n: Notification) => !n.is_read);
        if (latestUnread) {
          toast.custom((t) => (
            <div
              onClick={() => { toast.dismiss(t.id); if (latestUnread.link) navigate(latestUnread.link); }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '16px 20px', background: 'linear-gradient(135deg, #1e293b, #334155)',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '1px solid rgba(99,102,241,0.3)',
                cursor: 'pointer', maxWidth: 380, color: '#fff',
                animation: t.visible ? 'slideIn 0.3s ease' : 'fadeOut 0.3s ease',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={18} color="#fff" />
              </div>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontWeight: 700, fontSize: 13, marginBottom: 4}}>{latestUnread.title}</div>
                <div style={{fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any}}>
                  {latestUnread.message}
                </div>
                <div style={{fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6}}>Baru saja · Klik untuk lihat</div>
              </div>
            </div>
          ), { duration: 5000, position: 'top-right' });
        }
      }

      prevUnreadRef.current = newCount;
      isFirstLoad.current = false;
    } catch { /* ignore */ }
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await api.put(`/notifications/${n.id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifs(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setUnreadCount(0);
    prevUnreadRef.current = 0;
    fetchNotifications();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  return (
    <header className="header">
      <Toaster position="top-right" />
      <div className="header-left">
        <h2 style={{fontSize: 16, fontWeight: 600, color: 'var(--color-text)'}}>Sentrarsip</h2>
      </div>
      <div className="header-right">
        {/* Notification Bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="notification-bell" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifs && (
            <div className="notification-dropdown">
              <div className="notification-dropdown-header">
                <h3>Notifikasi</h3>
                {unreadCount > 0 && <button onClick={markAllRead}>Tandai semua dibaca</button>}
              </div>
              {notifications.length === 0 ? (
                <div className="notification-empty">Belum ada notifikasi</div>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => handleNotifClick(n)}>
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button className="user-profile-btn" onClick={() => setShowProfile(!showProfile)}>
            <div className="user-avatar">
              {user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="name">{user?.full_name}</div>
              <div className="role-badge">{user?.role}</div>
            </div>
            <ChevronDown size={14} />
          </button>
          {showProfile && (
            <div className="notification-dropdown" style={{ width: 200 }}>
              <button className="variable-menu-item" onClick={handleLogout} style={{ color: 'var(--color-error)' }}>
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
