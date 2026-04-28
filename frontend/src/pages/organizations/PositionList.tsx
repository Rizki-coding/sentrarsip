import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Position, Organization } from '../../types';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function PositionList() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Position | null>(null);
  const [form, setForm] = useState({ name: '', level: 1, organization_id: 0, parent_id: 0 });

  useEffect(() => {
    fetchPositions();
    api.get('/organizations/flat').then(r => setOrgs(r.data || []));
  }, []);

  const fetchPositions = async () => {
    const res = await api.get('/positions');
    setPositions(res.data || []);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', level: 5, organization_id: orgs[0]?.id || 0, parent_id: 0 });
    setShowModal(true);
  };

  const openEdit = (item: Position) => {
    setEditItem(item);
    setForm({ name: item.name, level: item.level, organization_id: item.organization_id, parent_id: item.parent_id || 0 });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (editItem) {
        await api.put(`/positions/${editItem.id}`, payload);
        toast.success('Jabatan berhasil diperbarui');
      } else {
        await api.post('/positions', payload);
        toast.success('Jabatan berhasil ditambahkan');
      }
      setShowModal(false);
      fetchPositions();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus jabatan ini?')) return;
    await api.delete(`/positions/${id}`);
    toast.success('Jabatan dihapus');
    fetchPositions();
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Jabatan</h1><p>Kelola daftar jabatan dan level</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Tambah Jabatan</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama Jabatan</th><th>Level</th><th>Organisasi</th><th>Induk (Atasan)</th><th>Aksi</th></tr></thead>
            <tbody>
              {positions.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight:600}}>{p.name}</td>
                  <td>{p.level}</td>
                  <td>{p.organization?.name}</td>
                  <td>{p.parent?.name || '-'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit size={14}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && <tr><td colSpan={4} className="empty-state"><p>Tidak ada data</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Jabatan' : 'Tambah Jabatan'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Jabatan</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tingkat Level (1 = Tertinggi)</label>
                  <input className="form-control" type="number" min={1} value={form.level} onChange={e => setForm({...form, level: Number(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>Unit Organisasi *</label>
                  <select className="form-control" value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value)})}>
                    <option value={0}>Pilih Organisasi...</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Jabatan Induk / Atasan (Opsional)</label>
                <select className="form-control" value={form.parent_id} onChange={e => setForm({...form, parent_id: Number(e.target.value)})}>
                  <option value={0}>Tidak ada (Root / Puncak)</option>
                  {positions.filter(p => p.id !== editItem?.id && (!form.organization_id || p.organization_id === form.organization_id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Level {p.level})</option>
                  ))}
                </select>
                <div style={{fontSize: 12, color:'var(--color-text-muted)', marginTop:4}}>Induk menentukan hierarki (contoh: Kepala Dinas menaungi Kabid).</div>
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
