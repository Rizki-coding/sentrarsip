import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Disposition, User } from '../../types';
import { Plus, X, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function DispositionPage() {
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('received');
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ letter_id: 0, to_user_id: 0, instruction: '', priority: 'biasa', deadline: '' });

  useEffect(() => { fetchDispositions(); }, [tab]);
  useEffect(() => { api.get('/users').then(r => setUsers(r.data.data || r.data || [])); }, []);

  const fetchDispositions = async () => {
    const res = await api.get('/dispositions', { params: { direction: tab === 'sent' ? 'sent' : undefined } });
    setDispositions(res.data.data || []);
    setTotal(res.data.total || 0);
  };

  const handleCreate = async () => {
    try {
      await api.post('/dispositions', form);
      toast.success('Disposisi dikirim');
      setShowCreate(false);
      fetchDispositions();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const markDone = async (id: number) => {
    await api.put(`/dispositions/${id}`, { status: 'done' });
    toast.success('Disposisi diselesaikan');
    fetchDispositions();
  };

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = { biasa: 'badge-default', segera: 'badge-warning', penting: 'badge-error' };
    return map[p] || 'badge-default';
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: 'badge-warning', read: 'badge-info', done: 'badge-success' };
    return map[s] || 'badge-default';
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Disposisi</h1><p>Kelola disposisi surat masuk</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Buat Disposisi</button>
      </div>

      <div className="card">
        <div className="tabs" style={{padding:'0 20px'}}>
          <button className={`tab ${tab==='received'?'active':''}`} onClick={() => setTab('received')}>Diterima</button>
          <button className={`tab ${tab==='sent'?'active':''}`} onClick={() => setTab('sent')}>Dikirim</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Surat</th><th>Dari</th><th>Kepada</th><th>Instruksi</th><th>Prioritas</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {dispositions.map(d => (
                <tr key={d.id}>
                  <td style={{fontWeight:600}}>{d.letter?.letter_type?.name || `ID: ${d.letter_id}`}</td>
                  <td>{d.from_user?.full_name}</td>
                  <td>{d.to_user?.full_name}</td>
                  <td>{d.instruction}</td>
                  <td><span className={`badge ${priorityBadge(d.priority)}`}>{d.priority}</span></td>
                  <td><span className={`badge ${statusBadge(d.status)}`}>{d.status}</span></td>
                  <td>
                    {d.status !== 'done' && tab === 'received' && (
                      <button className="btn btn-success btn-sm" onClick={() => markDone(d.id)}>
                        <CheckCircle size={13}/> Selesai
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {dispositions.length === 0 && <tr><td colSpan={7} className="empty-state"><p>Tidak ada disposisi</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Disposisi</h2>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ID Surat</label>
                <input className="form-control" type="number" value={form.letter_id || ''} onChange={e => setForm({...form, letter_id: Number(e.target.value)})} placeholder="Masukkan ID surat" />
              </div>
              <div className="form-group">
                <label>Ditujukan Kepada</label>
                <select className="form-control" value={form.to_user_id} onChange={e => setForm({...form, to_user_id: Number(e.target.value)})}>
                  <option value={0}>Pilih user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.position?.name})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Instruksi</label><textarea className="form-control" value={form.instruction} onChange={e => setForm({...form, instruction: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prioritas</label>
                  <select className="form-control" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="biasa">Biasa</option>
                    <option value="segera">Segera</option>
                    <option value="penting">Penting</option>
                  </select>
                </div>
                <div className="form-group"><label>Deadline</label><input className="form-control" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleCreate}>Kirim Disposisi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
