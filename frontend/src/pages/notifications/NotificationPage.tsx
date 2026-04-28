import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Notification } from '../../types';
import { Bell, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const res = await api.get('/notifications');
    setNotifications(res.data || []);
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    toast.success('Semua ditandai sudah dibaca');
    fetchNotifications();
    window.location.reload(); // update sidebar counter
  };

  const handleClick = async (n: Notification) => {
    if (!n.is_read) {
      await api.put(`/notifications/${n.id}/read`);
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div style={{maxWidth: 800, margin: '0 auto'}}>
      <Toaster position="top-right"/>
      <div className="page-header">
        <div>
          <h1><Bell size={24} style={{display:'inline',verticalAlign:'middle',marginRight:10}}/> Notifikasi Anda</h1>
          <p>Pemberitahuan surat masuk dan workflow disposisi</p>
        </div>
        <button className="btn btn-outline" onClick={markAllRead}>
          <CheckCircle size={14}/> Tandai Semua Dibaca
        </button>
      </div>

      <div className="card">
        <div style={{display:'flex',flexDirection:'column'}}>
          {notifications.map(n => (
            <div key={n.id} 
              onClick={() => handleClick(n)}
              style={{
                padding: '16px 20px', 
                borderBottom: '1px solid var(--color-border)',
                background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                cursor: 'pointer',
                display: 'flex', gap: 16, alignItems: 'center'
              }}>
               <div style={{width: 8, height: 8, borderRadius: '50%', background: n.is_read ? 'transparent' : 'var(--color-primary)'}} />
               <div style={{flex: 1}}>
                 <div style={{fontWeight:600}}>{n.title}</div>
                 <div style={{fontSize:13, color:'var(--color-text-muted)', marginTop:4}}>{n.message}</div>
                 <div style={{fontSize:11, color:'var(--color-text-muted)', marginTop:8}}>{new Date(n.created_at).toLocaleString('id-ID')}</div>
               </div>
            </div>
          ))}
          {notifications.length === 0 && <div className="empty-state" style={{padding:60}}>Tidak ada notifikasi</div>}
        </div>
      </div>
    </div>
  );
}
