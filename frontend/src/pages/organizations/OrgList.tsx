import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Organization } from '../../types';
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, Building2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function OrgList() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState({ name: '', code: '', description: '', parent_id: null as number | null });

  useEffect(() => { fetchOrgs(); }, []);

  const fetchOrgs = async () => {
    const [treeRes, flatRes] = await Promise.all([
      api.get('/organizations'),
      api.get('/organizations/flat'),
    ]);
    setOrgs(treeRes.data || []);
    setAllOrgs(flatRes.data || []);
  };

  const toggleExpand = (id: number) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const openCreate = (parentId?: number) => {
    setEditOrg(null);
    setForm({ name: '', code: '', description: '', parent_id: parentId || null });
    setShowModal(true);
  };

  const openEdit = (org: Organization) => {
    setEditOrg(org);
    setForm({ name: org.name, code: org.code, description: org.description, parent_id: org.parent_id });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editOrg) {
        await api.put(`/organizations/${editOrg.id}`, form);
        toast.success('Organisasi diperbarui');
      } else {
        await api.post('/organizations', form);
        toast.success('Organisasi dibuat');
      }
      setShowModal(false);
      fetchOrgs();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus organisasi ini?')) return;
    await api.delete(`/organizations/${id}`);
    toast.success('Dihapus');
    fetchOrgs();
  };

  const renderRows = () => {
    let rows: any[] = [];
    const flatten = (nodes: Organization[], depth = 0) => {
      nodes.forEach(org => {
        rows.push(
          <tr key={org.id}>
            <td style={{fontWeight:600, paddingLeft: `${depth * 24 + 16}px`}}>
              <div style={{display:'flex', alignItems:'center', gap: 8}}>
                {depth > 0 && <Building2 size={14} style={{opacity:0.5}} />}
                {org.name}
              </div>
            </td>
            <td><code>{org.code}</code></td>
            <td style={{color:'var(--color-text-muted)'}}>{org.description || '-'}</td>
            <td>
              <div className="action-btns">
                <button className="btn btn-ghost btn-sm" onClick={() => openCreate(org.id)} title="Tambah Sub Unit"><Plus size={14}/></button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(org)}><Edit size={14}/></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(org.id)}><Trash2 size={14}/></button>
              </div>
            </td>
          </tr>
        );
        if (org.children) {
          flatten(org.children, depth + 1);
        }
      });
    };
    flatten(orgs);
    return rows;
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Organisasi</h1><p>Kelola daftar instansi dan unit kerja</p></div>
        <button className="btn btn-primary" onClick={() => openCreate()}><Plus size={16}/> Tambah Organisasi</button>
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama Unit Organisasi</th><th>Kode</th><th>Deskripsi</th><th>Aksi</th></tr></thead>
            <tbody>
              {renderRows()}
              {orgs.length === 0 && <tr><td colSpan={4} className="empty-state"><p>Belum ada data organisasi</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editOrg ? 'Edit Organisasi' : 'Tambah Organisasi'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label>Nama</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>Kode</label><input className="form-control" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
              </div>
              <div className="form-group">
                <label>Induk Organisasi</label>
                <select className="form-control" value={form.parent_id || ''} onChange={e => setForm({...form, parent_id: e.target.value ? Number(e.target.value) : null})}>
                  <option value="">— Tidak ada (Root) —</option>
                  {allOrgs.filter(o => o.id !== editOrg?.id).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
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
