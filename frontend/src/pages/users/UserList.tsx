import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { User, Organization, Position } from '../../types';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState({ username:'', email:'', password:'', full_name:'', nip:'', role:'maker', organization_id:0, position_id:0 });

  useEffect(() => { fetchUsers(); }, [page, search, filterRole]);
  useEffect(() => {
    api.get('/organizations/flat').then(r => setOrgs(r.data || []));
    api.get('/positions').then(r => setPositions(r.data || []));
    api.get('/roles').then(r => setRoles(r.data || []));
  }, []);

  const fetchUsers = async () => {
    const res = await api.get('/users', { params: { page, limit: 10, search, role: filterRole || undefined } });
    setUsers(res.data.data || []);
    setTotal(res.data.total);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ username:'', email:'', password:'', full_name:'', nip:'', role: roles.find(r => r.code === 'pegawai')?.code || roles[0]?.code || '', organization_id: orgs[0]?.id || 0, position_id: positions[0]?.id || 0 });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ username: u.username, email: u.email, password: '', full_name: u.full_name, nip: u.nip, role: u.role, organization_id: u.organization_id, position_id: u.position_id });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, form);
        toast.success('User berhasil diperbarui');
      } else {
        await api.post('/users', form);
        toast.success('User berhasil dibuat');
      }
      setShowModal(false);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan user ini?')) return;
    await api.delete(`/users/${id}`);
    toast.success('User dinonaktifkan');
    fetchUsers();
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Kelola pengguna sistem Sentrarsip</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Tambah User</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input placeholder="Cari nama, username, NIP..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}>
            <option value="">Semua Role</option>
            {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama</th><th>Username</th><th>NIP</th><th>Role</th><th>Organisasi</th><th>Jabatan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.full_name}</td>
                  <td>{u.username}</td>
                  <td>{u.nip}</td>
                  <td><span className="badge badge-primary" style={{textTransform:'uppercase'}}>{u.role}</span></td>
                  <td>{u.organization?.name || '-'}</td>
                  <td>{u.position?.name || '-'}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><Edit size={14} /></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(u.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={8} className="empty-state"><p>Tidak ada data</p></td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Menampilkan {users.length} dari {total} data</div>
            <div className="pagination-btns">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
              {Array.from({length: Math.min(totalPages, 5)}, (_, i) => (
                <button key={i+1} className={page === i+1 ? 'active' : ''} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editUser ? 'Edit User' : 'Tambah User Baru'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input className="form-control" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input className="form-control" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>NIP</label>
                  <input className="form-control" value={form.nip} onChange={e => setForm({...form, nip: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Password {editUser && '(kosongkan jika tidak diubah)'}</label>
                <input className="form-control" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editUser} />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Organisasi</label>
                  <select className="form-control" value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value)})}>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Jabatan</label>
                  <select className="form-control" value={form.position_id} onChange={e => setForm({...form, position_id: Number(e.target.value)})}>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
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
