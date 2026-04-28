import { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import toast, { Toaster } from 'react-hot-toast';

export default function RoleAccessList() {
  const [roles, setRoles] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  // access structure: { roleCode: { menuId: { view: true, create: false, update: false, delete: false } } }
  const [access, setAccess] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/roles'),
      api.get('/letter-categories')
    ]).then(([resRoles, resCats]) => {
      const fetchedRoles = resRoles.data || [];
      setRoles(fetchedRoles);
      
      const dynMenus = [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'manajemen', name: 'Semua Fitur Manajemen (User, Role, Org, Jabatan dll)' },
        { id: 'master_data', name: 'Semua Master Data (Klasifikasi, Template, Lokasi dll)' },
        { id: 'arsip', name: 'Arsip Dokumen' },
        ...(resCats.data || []).map((c: any) => ({ id: `surat_${c.code}`, name: `Menu: ${c.name}` })),
        { id: 'workflow', name: 'Workflow Inbox' },
      ];
      setMenus(dynMenus);

      const mockAccess: any = {};
      fetchedRoles.forEach((r: any) => {
        try {
          // Parse from DB if exists
          mockAccess[r.code] = r.permissions ? JSON.parse(r.permissions) : {};
        } catch (e) {
          mockAccess[r.code] = {};
        }

        // Initialize missing menus
        dynMenus.forEach(m => {
          if (!mockAccess[r.code][m.id]) {
            let hasView = false;
            if (r.code === 'superadmin') hasView = true;
            else if (r.code === 'admin' && m.id !== 'manajemen') hasView = true;
            else if (r.code === 'pegawai' && (m.id === 'dashboard' || m.id === 'workflow' || m.id === 'arsip' || m.id.startsWith('surat_'))) hasView = true;
            
            mockAccess[r.code][m.id] = {
              view: hasView,
              create: hasView,
              update: hasView && r.code !== 'pegawai',
              delete: r.code === 'superadmin'
            };
          }
        });
      });
      setAccess(mockAccess);
    });
  }, []);

  const toggleAccess = (roleId: string, menuId: string, action: string) => {
    setAccess(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [menuId]: {
          ...(prev[roleId]?.[menuId] || { view: false, create: false, update: false, delete: false }),
          [action]: !prev[roleId]?.[menuId]?.[action]
        }
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save for each role
      await Promise.all(roles.map(r => 
        api.put(`/roles/${r.id}`, { ...r, permissions: JSON.stringify(access[r.code] || {}) })
      ));
      toast.success('Pengaturan akses role CRUD berhasil disimpan!');
    } catch (err: any) {
      toast.error('Gagal menyimpan akses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div>
          <h1>Akses Role Dinamis</h1>
          <p>Atur hak akses menu untuk setiap role pengguna</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: 'var(--color-primary)' }}>Informasi Matriks Akses</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
              Matriks ini sekarang menyesuaikan secara dinamis dengan role yang Anda buat di sistem dan Kategori Surat yang tersedia. 
              Pilih hak akses dengan mencentang kotak di bawah.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th style={{ width: 300 }}>Nama Menu / Fitur</th>
                {roles.map(r => (
                  <th key={r.code} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>{r.code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menus.map(menu => (
                <tr key={menu.id}>
                  <td style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                    {menu.name}
                  </td>
                  {roles.map(role => {
                    const rbac = access[role.code]?.[menu.id] || { view: false, create: false, update: false, delete: false };
                    return (
                      <td key={`${role.code}-${menu.id}`} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', paddingLeft: 20 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={rbac.view} onChange={() => toggleAccess(role.code, menu.id, 'view')} /> View
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={rbac.create} onChange={() => toggleAccess(role.code, menu.id, 'create')} /> Create
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={rbac.update} onChange={() => toggleAccess(role.code, menu.id, 'update')} /> Edit
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="checkbox" checked={rbac.delete} onChange={() => toggleAccess(role.code, menu.id, 'delete')} /> Delete
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={10} style={{textAlign:'center', padding:40}}>Memuat role dan menu...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
