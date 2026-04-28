import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { LetterCategory } from '../../types';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LetterCategoryList() {
  const [categories, setCategories] = useState<LetterCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Partial<LetterCategory>>({});
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    const res = await api.get('/letter-categories');
    setCategories(res.data || []);
  };

  const handleSave = async () => {
    try {
      if (isEdit) await api.put(`/letter-categories/${form.id}`, form);
      else await api.post('/letter-categories', form);
      
      toast.success('Kategori berhasil disimpan');
      setShowModal(false);
      fetchCategories();
      // Reload sidebar by triggering a window event or simple reload for now
      window.location.reload(); 
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/letter-categories/${id}`);
      toast.success('Dihapus');
      fetchCategories();
      window.location.reload();
    } catch (err: any) { toast.error('Gagal menghapus'); }
  };

  const openForm = (cat?: LetterCategory) => {
    if (cat) {
      setIsEdit(true);
      setForm(cat);
    } else {
      setIsEdit(false);
      setForm({ name: '', code: '', description: '', icon: 'Mail' });
    }
    setShowModal(true);
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div>
          <h1>Kategori Pembuatan Surat</h1>
          <p>Kelola kategori menu surat dinamis</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <Plus size={16}/> Tambah Kategori
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama</th><th>Kode</th><th>Icon</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id}>
                  <td style={{fontWeight:600}}>{c.name}</td>
                  <td><code>{c.code}</code></td>
                  <td>{c.icon}</td>
                  <td>{c.description}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openForm(c)}><Edit2 size={14}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} style={{color:'var(--color-error)'}}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={5} className="empty-state">Belum ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEdit ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Nama Kategori</label><input className="form-control" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Misal: Surat Internal" /></div>
              <div className="form-group"><label>Kode (URL Slug)</label><input className="form-control" value={form.code||''} onChange={e => setForm({...form, code: e.target.value})} placeholder="Misal: internal" /></div>
              <div className="form-group"><label>Icon (Lucide)</label><input className="form-control" value={form.icon||''} onChange={e => setForm({...form, icon: e.target.value})} placeholder="Misal: MailOpen" /></div>
              <div className="form-group"><label>Deskripsi</label><textarea className="form-control" value={form.description||''} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
