import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Group, User } from '../../types';
import { Plus, Edit, Trash2, X, Users2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function GroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editItem, setEditItem] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [memberIds, setMemberIds] = useState<number[]>([]);

  useEffect(() => {
    fetchGroups();
    api.get('/users').then(r => setUsers(r.data.data || r.data || []));
  }, []);

  const fetchGroups = async () => {
    const res = await api.get('/groups');
    setGroups(res.data || []);
  };

  const openCreate = () => { setEditItem(null); setForm({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (item: Group) => { setEditItem(item); setForm({ name: item.name, description: item.description }); setShowModal(true); };

  const handleSubmit = async () => {
    try {
      if (editItem) {
        await api.put(`/groups/${editItem.id}`, form);
        toast.success('Grup diperbarui');
      } else {
        await api.post('/groups', form);
        toast.success('Grup ditambahkan');
      }
      setShowModal(false);
      fetchGroups();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus grup ini?')) return;
    await api.delete(`/groups/${id}`);
    toast.success('Dihapus');
    fetchGroups();
  };

  const openMembers = (grp: Group) => {
    setSelectedGroup(grp);
    setMemberIds(grp.members?.map((m: any) => m.user_id) || []);
    setShowMembersModal(true);
  };

  const toggleMember = async (userId: number) => {
    if (!selectedGroup) return;
    try {
      if (memberIds.includes(userId)) {
        await api.delete(`/groups/${selectedGroup.id}/members/${userId}`);
        setMemberIds(prev => prev.filter(id => id !== userId));
      } else {
        await api.post(`/groups/${selectedGroup.id}/members`, { user_id: userId });
        setMemberIds(prev => [...prev, userId]);
      }
      fetchGroups(); // refresh background data
    } catch (err: any) { toast.error('Gagal update anggota'); }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Kelola Grup</h1><p>Kelola grup pengguna untuk penerima surat</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Buat Grup</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama Grup</th><th>Deskripsi</th><th>Jml Anggota</th><th>Aksi</th></tr></thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.id}>
                  <td style={{fontWeight:600}}>{g.name}</td>
                  <td>{g.description}</td>
                  <td>{g.members?.length || 0} orang</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-primary btn-sm" onClick={() => openMembers(g)} title="Kelola Anggota"><Users2 size={14}/> Anggota</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Edit size={14}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(g.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && <tr><td colSpan={4} className="empty-state"><p>Tidak ada data grup</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Grup' : 'Tambah Grup'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Nama Grup</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label>Deskripsi</label><textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 600}}>
            <div className="modal-header">
              <h2>Anggota Grup: {selectedGroup.name}</h2>
              <button className="btn btn-ghost" onClick={() => setShowMembersModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{maxHeight: '60vh', overflowY: 'auto'}}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Pilih</th><th>Nama</th><th>Organisasi</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{cursor: 'pointer'}} onClick={() => toggleMember(u.id)}>
                        <td>
                          <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => {}} />
                        </td>
                        <td style={{fontWeight:600}}>{u.full_name}</td>
                        <td>{u.organization?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowMembersModal(false)}>Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
