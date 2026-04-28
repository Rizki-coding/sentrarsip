import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { LetterType, LetterCategory } from '../../types';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LetterTypeList() {
  const [items, setItems] = useState<LetterType[]>([]);
  const [categories, setCategories] = useState<LetterCategory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LetterType | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', letter_category_id: 0 });

  useEffect(() => {
    fetchItems();
    api.get('/letter-categories').then(r => setCategories(r.data || []));
  }, []);

  const fetchItems = async () => {
    const res = await api.get('/letter-types');
    setItems(res.data || []);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', code: '', description: '', letter_category_id: categories[0]?.id || 0 });
    setShowModal(true);
  };

  const openEdit = (item: LetterType) => {
    setEditItem(item);
    setForm({ name: item.name, code: item.code, description: item.description || '', letter_category_id: item.letter_category_id || 0 });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form, letter_category_id: form.letter_category_id || null };
      if (editItem) {
        await api.put(`/letter-types/${editItem.id}`, payload);
        toast.success('Jenis Surat diperbarui');
      } else {
        await api.post('/letter-types', payload);
        toast.success('Jenis Surat ditambahkan');
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jenis surat ini?')) return;
    try {
      await api.delete(`/letter-types/${id}`);
      toast.success('Jenis Surat dihapus');
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div>
          <h1>Jenis Surat</h1>
          <p>Kelola daftar jenis surat dan hubungkan dengan Kategori Surat</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah Jenis Surat</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Kode</th><th>Nama Jenis Surat</th><th>Kategori Parent</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><span className="badge badge-default">{item.code}</span></td>
                  <td style={{fontWeight:600}}>{item.name}</td>
                  <td>{item.letter_category?.name || <span style={{color:'var(--color-text-muted)'}}>Tanpa Kategori</span>}</td>
                  <td>{item.description || '-'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="empty-state"><p>Tidak ada data jenis surat</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Jenis Surat' : 'Tambah Jenis Surat'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Kategori Induk Surat *</label>
                <select className="form-control" value={form.letter_category_id} onChange={e => setForm({...form, letter_category_id: Number(e.target.value)})}>
                  <option value={0}>-- Pilih Kategori --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{fontSize: 12, color:'var(--color-text-muted)', marginTop:4}}>Kategori menentukan di menu mana jenis surat ini akan muncul saat pembuatan surat baru.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nama Jenis Surat *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Kode Unik *</label>
                  <input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                </div>
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
