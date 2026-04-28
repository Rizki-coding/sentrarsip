import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertTriangle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Login gagal. Periksa username dan password.';
      setError(msg);
      toast.custom((t) => (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '16px 20px', background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
            borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(239,68,68,0.4)',
            maxWidth: 380, color: '#fff',
            animation: t.visible ? 'slideIn 0.3s ease' : 'fadeOut 0.3s ease',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} color="#fff" />
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontWeight: 700, fontSize: 13, marginBottom: 4}}>Login Gagal</div>
            <div style={{fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4}}>{msg}</div>
          </div>
        </div>
      ), { duration: 5000, position: 'top-right' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Toaster position="top-right" />
      <div className="login-card">
        <div className="login-logo">
          <div className="icon">SA</div>
          <h1>Sentrarsip</h1>
          <p>Sistem Kearsipan & Workflow Digital</p>
        </div>

        {error && (
          <div className="login-error" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, fontWeight: 500
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              className="form-control"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Demo: admin / admin123
        </p>
      </div>
    </div>
  );
}
