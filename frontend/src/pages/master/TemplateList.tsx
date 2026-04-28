import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Editor } from '@tinymce/tinymce-react';

export default function TemplateList() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', letter_type_id: 0, organization_id: 0, html_content: '', numbering_format: '', is_default: false });

  // TinyMCE keys (could also use environment variables)
  const editorConfig = {
    height: 600,
    menubar: false,
    plugins: ['advlist autolink lists link image charmap print preview anchor', 'searchreplace visualblocks code fullscreen', 'insertdatetime media table paste code help wordcount'],
    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | insertvariable | help',
    setup: (editor: any) => {
      editor.ui.registry.addMenuButton('insertvariable', {
        text: 'Insert Variable',
        fetch: (callback: any) => {
          const items = [
             {type: 'menuitem', text: 'Nomor Surat', onAction: () => editor.insertContent('${nomor_surat}')},
             {type: 'menuitem', text: 'Tanggal Surat', onAction: () => editor.insertContent('${tanggal_surat}')},
             {type: 'menuitem', text: 'Nama Pengirim', onAction: () => editor.insertContent('${pengirim_nama}')},
             {type: 'menuitem', text: 'NIP Pengirim', onAction: () => editor.insertContent('${pengirim_nip}')},
             {type: 'menuitem', text: 'Jabatan Pengirim', onAction: () => editor.insertContent('${pengirim_jabatan}')},
             {type: 'menuitem', text: 'Nama Penerima', onAction: () => editor.insertContent('${penerima_nama}')},
             {type: 'menuitem', text: 'Perihal / Hal', onAction: () => editor.insertContent('${perihal}')},
             {type: 'menuitem', text: 'Isi Surat', onAction: () => editor.insertContent('${isi_surat}')},
             {type: 'menuitem', text: 'Nama Penandatangan', onAction: () => editor.insertContent('${ttd_nama}')},
             {type: 'menuitem', text: 'NIP Penandatangan', onAction: () => editor.insertContent('${ttd_nip}')},
             {type: 'menuitem', text: 'Jabatan Penandatangan', onAction: () => editor.insertContent('${ttd_jabatan}')},
             {type: 'menuitem', text: 'QR Code Signature', onAction: () => editor.insertContent('${qrcode}')},
          ];
          callback(items);
        }
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
    api.get('/letter-types').then(r => setTypes(r.data || []));
    api.get('/organizations/flat').then(r => setOrgs(r.data || []));
  }, []);

  const fetchTemplates = async () => {
    const res = await api.get('/templates');
    setTemplates(res.data || []);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', letter_type_id: types[0]?.id || 0, organization_id: 0, html_content: '<p>Ketik template disini...</p>', numbering_format: '', is_default: false });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, letter_type_id: item.letter_type_id, organization_id: item.organization_id || 0, html_content: item.html_content, numbering_format: item.numbering_format || '', is_default: item.is_default });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = { ...form, organization_id: form.organization_id === 0 ? null : form.organization_id };
      if (editItem) {
        await api.put(`/templates/${editItem.id}`, payload);
        toast.success('Diperbarui');
      } else {
        await api.post('/templates', payload);
        toast.success('Ditambahkan');
      }
      setShowModal(false);
      fetchTemplates();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus template ini?')) return;
    await api.delete(`/templates/${id}`);
    toast.success('Dihapus');
    fetchTemplates();
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Template Surat</h1><p>Kelola desain dan tata bahasa surat secara dinamis</p></div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16}/> Buat Template</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nama Template</th><th>Jenis Surat</th><th>Organisasi</th><th>Format Nomor</th><th>Default</th><th>Aksi</th></tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td style={{fontWeight:600}}>{t.name}</td>
                  <td>{t.letter_type?.name}</td>
                  <td>{t.organization?.name || 'Umum (Semua)'}</td>
                  <td><code>{t.numbering_format || '-'}</code></td>
                  <td>{t.is_default ? <span className="badge badge-success">Ya</span> : <span className="badge badge-default">Tidak</span>}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Edit size={14}/></button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(t.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && <tr><td colSpan={6} className="empty-state"><p>Tidak ada data template</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{width:'90%', maxWidth:1200, height:'90vh', display:'flex', flexDirection:'column'}}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Template' : 'Tambah Template'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{flex: 1, overflowY:'auto'}}>
              <div className="form-row-3">
                <div className="form-group">
                  <label>Nama Template</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Jenis Surat Terkait</label>
                  <select className="form-control" value={form.letter_type_id} onChange={e => setForm({...form, letter_type_id: Number(e.target.value)})}>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Organisasi Terkait</label>
                  <select className="form-control" value={form.organization_id} onChange={e => setForm({...form, organization_id: Number(e.target.value)})}>
                    <option value={0}>Umum (Seluruh Organisasi)</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Format Penomoran Surat</label>
                <div style={{display:'flex', gap:10, marginBottom:8}}>
                  <input className="form-control" style={{flex:1, background:'var(--color-bg-secondary)'}} readOnly value={form.numbering_format} placeholder="Klik variabel di bawah untuk menyusun format..." />
                  <button className="btn btn-outline" onClick={() => setForm({...form, numbering_format: form.numbering_format.slice(0, -1)})} disabled={!form.numbering_format}>Hapus 1 Karakter</button>
                  <button className="btn btn-ghost" onClick={() => setForm({...form, numbering_format: ''})} disabled={!form.numbering_format}>Clear</button>
                </div>
                <div style={{display:'flex', gap:8, flexWrap:'wrap', padding:10, border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', background:'#fcfcfc'}}>
                  <span style={{fontSize:12, fontWeight:600, width:'100%', marginBottom:4, color:'var(--color-text-muted)'}}>Variabel yang tersedia (Klik untuk sisip):</span>
                  {['{no}', '{kode_jenis}', '{kode_org}', '{bulan}', '{tahun}', '/', '-'].map(token => (
                    <button key={token} className="badge badge-primary" style={{cursor:'pointer', border:'none', padding:'6px 12px', fontSize:13}} onClick={() => setForm({...form, numbering_format: form.numbering_format + token})}>
                      {token}
                    </button>
                  ))}
                  <button className="badge badge-default" style={{cursor:'pointer', border:'dashed 1px #ccc', padding:'6px 12px', fontSize:13}} onClick={() => {
                    const customText = prompt('Masukkan teks tambahan (misal: KOMINFO):');
                    if (customText) setForm({...form, numbering_format: form.numbering_format + customText});
                  }}>+ Teks Bebas</button>
                </div>
              </div>
              <div style={{marginBottom: 20}}>
                <label style={{display:'flex', alignItems:'center', gap: 10}}>
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({...form, is_default: e.target.checked})} />
                  Jadikan sebagai template default untuk jenis surat ini
                </label>
              </div>
              <div className="form-group" style={{height: '100%'}}>
                 <label>Editor Desain (Seperti Word)</label>
                 <Editor
                    apiKey="4ie9bb1953z5fgryel9wmax7g4eh2vtanggekprjw1rkxfay"
                    init={editorConfig}
                    value={form.html_content}
                    onEditorChange={(content) => setForm({...form, html_content: content})}
                 />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Simpan Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
