import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface MasterItem { id: number; name: string; code: string; description?: string; room?: string; shelf?: string; box?: string; }

export default function MasterDataPage({ type }: { type: 'letter-types' | 'document-locations' }) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MasterItem | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', room: '', shelf: '', box: '' });

  const titles: Record<string, string> = { 'letter-types': 'Jenis Surat', 'document-locations': 'Lokasi Dokumen' };
  const isDocLoc = type === 'document-locations';

  useEffect(() => { fetchItems(); }, [type]);

  const fetchItems = async () => {
    const res = await api.get(`/${type}`);
    setItems(res.data || []);
  };

  const openCreate = () => { setEditItem(null); setForm({ name:'', code:'', description:'', room:'', shelf:'', box:'' }); setShowModal(true); };
  const openEdit = (item: MasterItem) => {
    setEditItem(item);
    setForm({ name: item.name, code: item.code, description: item.description||'', room: item.room||'', shelf: item.shelf||'', box: item.box||'' });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const data = isDocLoc ? form : { name: form.name, code: form.code, description: form.description };
      if (editItem) { await api.put(`/${type}/${editItem.id}`, data); toast.success('Berhasil diperbarui'); }
      else { await api.post(`/${type}`, data); toast.success('Berhasil ditambahkan'); }
      setShowModal(false); fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus data ini?')) return;
    await api.delete(`/${type}/${id}`);
    toast.success('Dihapus'); fetchItems();
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>{titles[type]}</h1><p>Kelola data master {titles[type].toLowerCase()}</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Tambah</button>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Kode</th><th>Nama</th>{isDocLoc && <><th>Ruangan</th><th>Rak</th><th>Box</th></>}<th>Aksi</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td><span className="badge badge-default">{item.code}</span></td>
                  <td style={{fontWeight:600}}>{item.name}</td>
                  {isDocLoc && <><td>{item.room}</td><td>{item.shelf}</td><td>{item.box}</td></>}
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}><Edit size={14}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(item.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={isDocLoc ? 6 : 3} className="empty-state"><p>Tidak ada data</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit' : 'Tambah'} {titles[type]}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Nama</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>Kode</label><input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
              </div>
              {isDocLoc && (
                <div className="form-row-3">
                  <div className="form-group"><label>Ruangan</label><input className="form-control" value={form.room} onChange={e => setForm({...form, room: e.target.value})} /></div>
                  <div className="form-group"><label>Rak</label><input className="form-control" value={form.shelf} onChange={e => setForm({...form, shelf: e.target.value})} /></div>
                  <div className="form-group"><label>Box</label><input className="form-control" value={form.box} onChange={e => setForm({...form, box: e.target.value})} /></div>
                </div>
              )}
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
