import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Letter } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Inbox, CheckCircle, Edit3, Stamp, BookOpen, Eye, Clock, AlertCircle } from 'lucide-react';

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_review: 'Menunggu Review', revision: 'Revisi',
  pending_sign: 'Menunggu TTD', signed: 'Ditandatangani', published: 'Diterbitkan',
};

function getMyRole(letter: Letter, userId: number | undefined) {
  if (!userId) return null;
  const checkerIdx = letter.current_checker_index ?? 0;
  const approverIdx = letter.current_approver_index ?? 0;

  if (letter.status === 'pending_review' && letter.checkers?.[checkerIdx]?.id === userId) {
    return { role: 'Checker', label: 'Review & Setujui', icon: Edit3, color: 'var(--color-warning)' };
  }
  if (letter.status === 'pending_sign' && letter.approvers?.[approverIdx]?.id === userId) {
    return { role: 'Approver', label: 'Tanda Tangan', icon: Stamp, color: 'var(--color-success)' };
  }
  if (letter.status === 'signed' && letter.publisher_id === userId) {
    return { role: 'Publisher', label: 'Terbitkan', icon: BookOpen, color: 'var(--color-primary)' };
  }
  return null;
}

export default function ActionInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { fetchInbox(); }, [page]);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get('/letters', { params: { inbox: 'true', page, limit: 20 } });
      setLetters(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      setLetters([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  // Group by action type
  const reviewLetters = letters.filter(l => l.status === 'pending_review');
  const signLetters = letters.filter(l => l.status === 'pending_sign');
  const publishLetters = letters.filter(l => l.status === 'signed');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Inbox size={24} style={{display:'inline',verticalAlign:'middle',marginRight:10}}/> Kotak Tindakan</h1>
          <p>Surat yang membutuhkan tindakan Anda — Total: <strong>{total}</strong> surat</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
        <div className="card" style={{borderLeft:'4px solid var(--color-warning)'}}>
          <div className="card-body" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                <Edit3 size={15}/> Perlu Review
              </div>
              <div style={{fontSize:28,fontWeight:700,color:'var(--color-warning)'}}>{reviewLetters.length}</div>
            </div>
            <Edit3 size={32} style={{color:'rgba(245,158,11,0.2)'}} />
          </div>
        </div>
        <div className="card" style={{borderLeft:'4px solid var(--color-success)'}}>
          <div className="card-body" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                <Stamp size={15}/> Perlu Tanda Tangan
              </div>
              <div style={{fontSize:28,fontWeight:700,color:'var(--color-success)'}}>{signLetters.length}</div>
            </div>
            <Stamp size={32} style={{color:'rgba(34,197,94,0.2)'}} />
          </div>
        </div>
        <div className="card" style={{borderLeft:'4px solid var(--color-primary)'}}>
          <div className="card-body" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                <BookOpen size={15}/> Perlu Diterbitkan
              </div>
              <div style={{fontSize:28,fontWeight:700,color:'var(--color-primary)'}}>{publishLetters.length}</div>
            </div>
            <BookOpen size={32} style={{color:'rgba(99,102,241,0.2)'}} />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-spinner"><div className="spinner"/></div>
      )}

      {!loading && letters.length === 0 && (
        <div className="card">
          <div className="card-body" style={{textAlign:'center',padding:60}}>
            <CheckCircle size={48} style={{color:'var(--color-success)',marginBottom:16}} />
            <h3 style={{color:'var(--color-text-muted)'}}>Semua Beres! 🎉</h3>
            <p style={{color:'var(--color-text-muted)'}}>Tidak ada surat yang membutuhkan tindakan Anda saat ini.</p>
          </div>
        </div>
      )}

      {!loading && letters.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Daftar Surat Menunggu Tindakan</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tindakan</th>
                  <th>Nomor Surat</th>
                  <th>Perihal</th>
                  <th>Jenis</th>
                  <th>Pembuat</th>
                  <th>Status</th>
                  <th>Tanggal Masuk</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {letters.map(l => {
                  const myRole = getMyRole(l, user?.id);
                  const RoleIcon = myRole?.icon || AlertCircle;
                  return (
                    <tr key={l.id} style={{background:'rgba(59,130,246,0.03)'}}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{
                            width:32,height:32,borderRadius:'var(--radius-sm)',
                            background: myRole ? `${myRole.color}15` : 'var(--bg-subtle)',
                            display:'flex',alignItems:'center',justifyContent:'center'
                          }}>
                            <RoleIcon size={16} style={{color: myRole?.color || 'var(--color-text-muted)'}} />
                          </div>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color: myRole?.color}}>{myRole?.label || 'Tindak Lanjut'}</div>
                            <div style={{fontSize:10,color:'var(--color-text-muted)'}}>{myRole?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{fontWeight:600,fontSize:12,fontFamily:'monospace'}}>{l.letter_number}</td>
                      <td>
                        <div style={{fontWeight:500}}>{l.subject}</div>
                      </td>
                      <td style={{fontSize:13}}>{l.letter_type?.name}</td>
                      <td style={{fontSize:13}}>{l.creator?.full_name}</td>
                      <td>
                        <span className={`badge status-${l.status}`}>{statusLabels[l.status] || l.status}</span>
                      </td>
                      <td style={{fontSize:12,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={12} style={{color:'var(--color-text-muted)'}} />
                          {new Date(l.updated_at || l.created_at).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'})}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/letters/${l.id}`)} style={{display:'flex',alignItems:'center',gap:4}}>
                          <RoleIcon size={13}/> Proses
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">{letters.length} dari {total}</div>
              <div className="pagination-btns">
                <button disabled={page<=1} onClick={() => setPage(p=>p-1)}>Prev</button>
                <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
