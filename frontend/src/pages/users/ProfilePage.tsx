import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { User, UserPosition } from '../../types';
import { User as UserIcon, Lock, KeyRound } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [positions, setPositions] = useState<UserPosition[]>([]);
  
  const [pwd, setPwd] = useState({ old_password: '', new_password: '', confirm: '' });

  useEffect(() => {
    api.get('/auth/me').then(r => setProfile(r.data));
    if (user?.id) {
       api.get(`/users/position-history?user_id=${user.id}`).then(r => setPositions(r.data||[]));
    }
  }, [user]);

  const changePassword = async () => {
    if (pwd.new_password !== pwd.confirm) return toast.error('Password baru dan konfirmasi tidak cocok');
    try {
      await api.put('/auth/change-password', {
        old_password: pwd.old_password, new_password: pwd.new_password
      });
      toast.success('Password berhasil diubah');
      setPwd({ old_password: '', new_password: '', confirm: '' });
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal mengubah password'); }
  };

  if (!profile) return <div className="loading-spinner"><div className="spinner"/></div>;

  return (
    <div style={{maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
      <Toaster position="top-right" />
      
      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h3><UserIcon size={18} style={{marginRight:8,verticalAlign:'middle'}}/> Profil Pengguna</h3>
        </div>
        <div className="card-body">
          <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
            <div style={{width:100,height:100,borderRadius:'50%',background:'var(--color-primary)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,fontWeight:700}}>
              {profile.full_name.charAt(0)}
            </div>
          </div>
          <table className="table">
            <tbody>
              <tr><td style={{fontWeight:600,width:120}}>Nama</td><td>{profile.full_name}</td></tr>
              <tr><td style={{fontWeight:600}}>NIP</td><td>{profile.nip || '-'}</td></tr>
              <tr><td style={{fontWeight:600}}>Email</td><td>{profile.email}</td></tr>
              <tr><td style={{fontWeight:600}}>Role</td><td><span className="badge badge-info">{profile.role}</span></td></tr>
              <tr><td style={{fontWeight:600}}>Jabatan Saat Ini</td><td>{positions.find(p => !p.end_date || p.end_date.startsWith('0001-'))?.position?.name || '-'}</td></tr>
            </tbody>
          </table>

          <h4 style={{marginTop:30,marginBottom:10}}>Riwayat Jabatan Saya</h4>
          <div style={{fontSize:13}}>
            {positions.map(p => (
              <div key={p.id} style={{padding:'8px 0', borderBottom:'1px dashed #eee'}}>
                <strong>{p.position?.name}</strong> <span className={`badge ${p.is_primary?'badge-primary':'badge-default'}`} style={{fontSize:10}}>{p.is_primary?'Utama':'Tambahan'}</span><br/>
                <span style={{color:'var(--color-text-muted)'}}>{new Date(p.start_date).toISOString().split('T')[0]} - {(!p.end_date || p.end_date.startsWith('0001-')) ? 'Sekarang' : new Date(p.end_date).toISOString().split('T')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
           <h3><Lock size={18} style={{marginRight:8,verticalAlign:'middle'}}/> Keamanan Akun</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
             <label><KeyRound size={12}/> Password Lama</label>
             <input type="password" placeholder="Password saat ini" className="form-control" value={pwd.old_password} onChange={e => setPwd({...pwd, old_password: e.target.value})}/>
          </div>
          <div className="form-group" style={{marginTop: 20}}>
             <label><KeyRound size={12}/> Password Baru</label>
             <input type="password" placeholder="Minimal 6 karakter" className="form-control" value={pwd.new_password} onChange={e => setPwd({...pwd, new_password: e.target.value})}/>
          </div>
          <div className="form-group">
             <label><KeyRound size={12}/> Konfirmasi Password Baru</label>
             <input type="password" placeholder="Ulangi password baru" className="form-control" value={pwd.confirm} onChange={e => setPwd({...pwd, confirm: e.target.value})}/>
          </div>
          <button className="btn btn-primary" style={{width:'100%',marginTop:20}} onClick={changePassword} disabled={!pwd.old_password || !pwd.new_password || !pwd.confirm}>Ubah Password</button>
        </div>
      </div>
    </div>
  );
}
