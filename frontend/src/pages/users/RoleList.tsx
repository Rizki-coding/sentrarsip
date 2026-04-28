import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import FeedbackModal from '../../components/ui/FeedbackModal';

export default function RoleList() {
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [feedback, setFeedback] = useState<{isOpen: boolean, type: 'success'|'error'|'warning', title: string, message: string, actionLabel: string, onAction?: any}>({isOpen: false, type: 'success', title: '', message: '', actionLabel: ''});

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    const res = await api.get('/roles');
    setRoles(res.data || []);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, code: item.code, description: item.description });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editItem) {
        await api.put(`/roles/${editItem.id}`, form);
        setFeedback({ isOpen: true, type: 'success', title: 'Berhasil Edit', message: 'Role berhasil diperbarui', actionLabel: '' });
      } else {
        await api.post('/roles', form);
        setFeedback({ isOpen: true, type: 'success', title: 'Berhasil Tambah', message: 'Role baru berhasil ditambahkan', actionLabel: '' });
      }
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      setFeedback({ isOpen: true, type: 'error', title: 'Gagal', message: err.response?.data?.error || 'Gagal menyimpan role', actionLabel: '' });
    }
  };

  const promptDelete = (id: number) => {
    setFeedback({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Role',
      message: 'Apakah Anda yakin ingin menghapus role ini? Aksi ini tidak dapat dibatalkan.',
      actionLabel: 'Hapus',
      onAction: () => execDelete(id)
    });
  };

  const execDelete = async (id: number) => {
    setFeedback(f => ({...f, isOpen: false}));
    try {
      await api.delete(`/roles/${id}`);
      setFeedback({ isOpen: true, type: 'success', title: 'Terhapus', message: 'Role berhasil dihapus', actionLabel: '' });
      fetchRoles();
    } catch (err: any) {
      setFeedback({ isOpen: true, type: 'error', title: 'Gagal', message: err.response?.data?.error || 'Gagal menghapus', actionLabel: '' });
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <FeedbackModal 
        isOpen={feedback.isOpen} 
        type={feedback.type} 
        title={feedback.title} 
        message={feedback.message}
        actionLabel={feedback.actionLabel}
        onAction={feedback.onAction}
        onClose={() => setFeedback({...feedback, isOpen: false, onAction: undefined})} 
      />
      <div className="page-header">
        <div>
          <h1>Role Pengguna</h1>
          <p>Kelola daftar peran pengguna dalam sistem</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah Role</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama Role</th><th>Kode Role</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td style={{fontWeight:600}}>{r.name}</td>
                  <td><code>{r.code}</code></td>
                  <td>{r.description || '-'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => promptDelete(r.id)} disabled={['superadmin', 'admin', 'pegawai'].includes(r.code)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={4} className="empty-state"><p>Tidak ada data role</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Role' : 'Tambah Role Baru'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Role</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value, code: editItem ? form.code : e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')})} />
              </div>
              <div className="form-group">
                <label>Kode Role (Sistem)</label>
                <input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')})} disabled={!!editItem} />
              </div>
              <div className="form-group">
                <label>Deskripsi</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
