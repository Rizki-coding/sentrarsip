import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Classification } from '../../types';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ClassificationList() {
  const [classes, setClasses] = useState<Classification[]>([]);
  const [flatClasses, setFlatClasses] = useState<Classification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Classification | null>(null);
  const [form, setForm] = useState({ parent_id: 0, code: '', name: '', retention_active_years: 0, retention_inactive_years: 0, description: '' });

  useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    const res = await api.get('/classifications');
    setClasses(res.data || []);
    const flatRes = await api.get('/classifications/flat');
    setFlatClasses(flatRes.data || []);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ parent_id: 0, code: '', name: '', retention_active_years: 1, retention_inactive_years: 0, description: '' });
    setShowModal(true);
  };

  const openEdit = (item: Classification) => {
    setEditItem(item);
    setForm({ 
      parent_id: item.parent_id || 0, 
      code: item.code, 
      name: item.name, 
      retention_active_years: item.retention_active_years || 0, 
      retention_inactive_years: item.retention_inactive_years || 0, 
      description: item.description || '' 
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form, parent_id: form.parent_id === 0 ? null : form.parent_id };
      if (editItem) {
        await api.put(`/classifications/${editItem.id}`, payload);
        toast.success('Diperbarui');
      } else {
        await api.post('/classifications', payload);
        toast.success('Ditambahkan');
      }
      setShowModal(false);
      fetchClasses();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    await api.delete(`/classifications/${id}`);
    toast.success('Dihapus');
    fetchClasses();
  };

  const renderRows = () => {
    let rows: any[] = [];
    const flatten = (nodes: Classification[], depth = 0) => {
      nodes.forEach(c => {
        rows.push(
          <tr key={c.id}>
            <td style={{paddingLeft: `${depth * 24 + 16}px`}}>
              <div style={{display:'flex', alignItems:'center', gap: 8}}>
                <span className="badge badge-default">{c.code}</span>
              </div>
            </td>
            <td style={{fontWeight:600}}>{c.name}</td>
            <td>{c.retention_active_years} thn / {c.retention_inactive_years} thn</td>
            <td style={{color:'var(--color-text-muted)'}}>{c.description || '-'}</td>
            <td>
              <div className="action-btns">
                 <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><Edit size={14}/></button>
                 <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)}><Trash2 size={14}/></button>
              </div>
            </td>
          </tr>
        );
        if (c.children) {
          flatten(c.children, depth + 1);
        }
      });
    };
    flatten(classes);
    return rows;
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Klasifikasi Arsip</h1><p>Kelola pokok masalah, sub, dan retensi</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Tambah Klasifikasi</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Kode</th><th>Nama Klasifikasi</th><th>Retensi (Aktif/Inaktif)</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
            <tbody>
              {renderRows()}
              {classes.length === 0 && <tr><td colSpan={5} className="empty-state"><p>Tidak ada data klasifikasi</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Klasifikasi' : 'Tambah Klasifikasi'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Induk Klasifikasi</label>
                <select className="form-control" value={form.parent_id} onChange={e => setForm({...form, parent_id: Number(e.target.value)})}>
                  <option value={0}>Tidak Ada (Sebagai Pokok Utama)</option>
                  {flatClasses.filter(c => c.id !== editItem?.id).map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Kode</label><input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Contoh: KP.01" /></div>
                <div className="form-group"><label>Nama Klasifikasi</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Retensi Aktif (Tahun)</label><input type="number" className="form-control" value={form.retention_active_years} onChange={e => setForm({...form, retention_active_years: Number(e.target.value)})} min={0} /></div>
                <div className="form-group"><label>Retensi Inaktif (Tahun)</label><input type="number" className="form-control" value={form.retention_inactive_years} onChange={e => setForm({...form, retention_inactive_years: Number(e.target.value)})} min={0} /></div>
              </div>
              <div className="form-group"><label>Deskripsi</label><textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
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
