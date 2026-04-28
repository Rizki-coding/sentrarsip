import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { LetterType, User, Organization, Position, Group, LetterCategory } from '../../types';
import { Send, ArrowLeft, ArrowRight, Zap, X, Plus, Trash2, FileText } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import toast, { Toaster } from 'react-hot-toast';
import FeedbackModal from '../../components/ui/FeedbackModal';

const VARIABLES = [
  { key: 'nomor_surat', label: 'Nomor Surat' },
  { key: 'tanggal', label: 'Tanggal Surat' },
  { key: 'perihal', label: 'Perihal' },
  { key: 'pengirim', label: 'Nama Pengirim' },
  { key: 'jabatan_pengirim', label: 'Jabatan Pengirim' },
  { key: 'penerima_nama', label: 'Nama Penerima' },
  { key: 'penerima_jabatan', label: 'Jabatan Penerima' },
  { key: 'isi_surat', label: 'Isi Surat' },
  { key: 'kota', label: 'Kota' },
  { key: 'ttd_nama', label: 'Nama Penandatangan' },
  { key: 'ttd_nip', label: 'NIP Penandatangan' },
  { key: 'ttd_jabatan', label: 'Jabatan Penandatangan' },
  { key: 'qrcode', label: 'QR Code TTD' },
];

export default function LetterCreate() {
  const navigate = useNavigate();
  const { categoryCode } = useParams();
  const editorRef = useRef<any>(null);
  const [step, setStep] = useState(1);
  const [allLetterTypes, setAllLetterTypes] = useState<LetterType[]>([]);
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [category, setCategory] = useState<LetterCategory | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: 'success' as 'success'|'error'|'warning', title: '', message: '', actionLabel: '', onAction: null as any });

  const [form, setForm] = useState({
    letter_type_id: 0,
    subject: '',
    direction: categoryCode || '-',
    content_html: '',
    letter_date: new Date().toISOString().split('T')[0],
    publisher_id: 0
  });
  const [checkerIds, setCheckerIds] = useState<number[]>([0]);
  const [approverIds, setApproverIds] = useState<number[]>([0]);
  const [recipients, setRecipients] = useState<{recipient_type: string; recipient_id: number; recipient_name: string}[]>([]);
  const [recipientTab, setRecipientTab] = useState('personal');

  useEffect(() => {
    api.get('/letter-types').then(r => {
      const types = r.data || [];
      setAllLetterTypes(types);
    });
    api.get('/users').then(r => setUsers(r.data.data || r.data || []));
    api.get('/organizations/flat').then(r => setOrgs(r.data || []));
    api.get('/positions').then(r => setPositions(r.data || []));
    api.get('/groups').then(r => setGroups(r.data || []));
    if (categoryCode) {
      api.get('/letter-categories').then(r => {
        const cats: LetterCategory[] = r.data || [];
        const cat = cats.find(c => c.code === categoryCode);
        setCategory(cat || null);
        setForm(f => ({...f, direction: categoryCode}));
      });
    }
  }, []);

  useEffect(() => {
    if (category && allLetterTypes.length > 0) {
      const filtered = allLetterTypes.filter(lt => lt.letter_category_id === category.id);
      setLetterTypes(filtered.length > 0 ? filtered : allLetterTypes);
    } else {
      setLetterTypes(allLetterTypes);
    }
  }, [category, allLetterTypes]);

  const loadTemplate = async (letterTypeId: number) => {
    if (!letterTypeId) {
      setForm(f => ({ ...f, content_html: '' }));
      if (editorRef.current) editorRef.current.setContent('');
      return;
    }
    setTemplateLoading(true);
    try {
      const res = await api.get(`/templates/default/${letterTypeId}`);
      if (res.data?.html_content) {
        const html = res.data.html_content;
        setForm(f => ({ ...f, content_html: html }));
        // If editor is already open, set content directly
        if (editorRef.current) {
          editorRef.current.setContent(html);
        }
        toast.success('Template surat berhasil dimuat');
      }
    } catch {
      // No default template
      setForm(f => ({ ...f, content_html: '' }));
      if (editorRef.current) editorRef.current.setContent('');
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Template Belum Tersedia',
        message: 'Belum ada template default untuk jenis surat ini. Anda bisa menulis isi surat secara manual.',
        actionLabel: '',
        onAction: null
      });
    } finally {
      setTemplateLoading(false);
    }
  };

  const insertVariable = (varKey: string) => {
    const tag = '${' + varKey + '}';
    if (editorRef.current) {
      editorRef.current.insertContent(`<span style="color:#0066cc;background:#e8f0fe;padding:1px 4px;border-radius:3px;font-weight:600">${tag}</span>`);
    }
    setShowVarMenu(false);
  };

  const addRecipient = (type: string, id: number, name: string) => {
    if (recipients.find(r => r.recipient_type === type && r.recipient_id === id)) return;
    setRecipients([...recipients, { recipient_type: type, recipient_id: id, recipient_name: name }]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      const content = editorRef.current ? editorRef.current.getContent() : form.content_html;
      const res = await api.post('/letters', {
        ...form,
        content_html: content,
        checker_ids: checkerIds.filter(id => id > 0),
        approver_ids: approverIds.filter(id => id > 0),
        recipients,
      });
      toast.success('Draft surat tersimpan');
      navigate(`/surat/${categoryCode}/edit/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    }
  };

  const handleSubmit = async () => {
    try {
      const content = editorRef.current ? editorRef.current.getContent() : form.content_html;
      const res = await api.post('/letters', {
        ...form,
        content_html: content,
        checker_ids: checkerIds.filter(id => id > 0),
        approver_ids: approverIds.filter(id => id > 0),
        recipients,
      });
      const letterId = res.data.id;
      await api.post(`/letters/${letterId}/submit`);
      
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Surat Terkirim!',
        message: 'Surat Anda berhasil diajukan ke langkah persetujuan berikutnya. Anda dapat memantaunya di menu "Sedang Berjalan".',
        actionLabel: 'Selesai',
        onAction: () => navigate(categoryCode ? `/surat/${categoryCode}` : '/')
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal submit');
    }
  };

  const validApprovers = approverIds.filter(id => id > 0).length;
  const canProceed = form.letter_type_id > 0 && form.subject && validApprovers > 0;

  return (
    <div>
      <Toaster position="top-right" />
      <FeedbackModal 
        isOpen={modal.isOpen} 
        type={modal.type} 
        title={modal.title} 
        message={modal.message}
        actionLabel={modal.actionLabel}
        onAction={modal.onAction}
        onClose={() => setModal({...modal, isOpen: false})} 
      />
      <div className="page-header">
        <div>
          <h1>Buat Surat Baru {category ? `— ${category.name}` : ''}</h1>
          <p>Buat surat dinas dengan template dan variable otomatis</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate(categoryCode ? `/surat/${categoryCode}` : '/')}><ArrowLeft size={16}/> Kembali</button>
      </div>

      {/* Steps indicator */}
      <div className="steps-indicator">
        <div className={`step-dot ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
          <div className="dot">1</div>
          <span className="step-label">Jenis & Detail</span>
        </div>
        <div className={`step-line ${step > 1 ? 'completed' : ''}`} />
        <div className={`step-dot ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
          <div className="dot">2</div>
          <span className="step-label">Penerima</span>
        </div>
        <div className={`step-line ${step > 2 ? 'completed' : ''}`} />
        <div className={`step-dot ${step >= 3 ? 'active' : ''}`}>
          <div className="dot">3</div>
          <span className="step-label">Editor Surat</span>
        </div>
      </div>

      {/* Step 1: Type & Details */}
      {step === 1 && (
        <div className="card">
          <div className="card-header"><h3>Detail Surat</h3></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label>Jenis Surat *</label>
                <select className="form-control" value={form.letter_type_id} onChange={e => {
                  const id = Number(e.target.value);
                  setForm({...form, letter_type_id: id});
                  if (id) loadTemplate(id);
                }}>
                  <option value={0}>Pilih jenis surat...</option>
                  {letterTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.code})</option>)}
                </select>
                {templateLoading && <p style={{fontSize:12,color:'var(--color-primary)',marginTop:4}}>⏳ Memuat template...</p>}
                {form.content_html && !templateLoading && <p style={{fontSize:12,color:'var(--color-success)',marginTop:4}}>✅ Template dimuat — bisa diedit di Step 3</p>}
              </div>
            </div>
            <div className="form-group">
              <label>Perihal *</label>
              <input className="form-control" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Masukkan perihal surat" />
            </div>
            <div className="form-group">
              <label>Tanggal Surat</label>
              <input className="form-control" type="date" value={form.letter_date} readOnly style={{backgroundColor:'var(--bg-subtle)', color:'var(--color-text-muted)', cursor:'not-allowed'}} title="Tanggal akan otomatis sesuai tgl approve" />
            </div>

            <h4 style={{marginTop: 20, marginBottom: 10, borderBottom: '1px solid var(--border-color)', paddingBottom: 5}}>Alur Persetujuan (Workflow)</h4>

            {/* Multiple Checkers */}
            <div className="form-group">
              <label>Pemeriksa (Checker) (Opsional) <button className="btn btn-ghost btn-sm" style={{marginLeft:8}} onClick={() => setCheckerIds([...checkerIds, 0])}><Plus size={12}/> Tambah</button></label>
              {checkerIds.map((cid, i) => (
                <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                  <select className="form-control" value={cid} onChange={e => { const arr = [...checkerIds]; arr[i] = Number(e.target.value); setCheckerIds(arr); }}>
                    <option value={0}>Pilih Pemeriksa...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} - {u.position?.name || u.role}</option>)}
                  </select>
                  {checkerIds.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setCheckerIds(checkerIds.filter((_, j) => j !== i))}><Trash2 size={14}/></button>
                  )}
                </div>
              ))}
              {checkerIds.filter(id => id > 0).length > 0 && (
                <p style={{fontSize:12,color:'var(--color-text-muted)'}}>
                  ℹ️ Urutan checker: {checkerIds.filter(id => id > 0).map((cid, i) => {
                    const u = users.find(u => u.id === cid);
                    return `#${i+1} ${u?.full_name || '-'}`;
                  }).join(' → ')}
                </p>
              )}
            </div>

            {/* Multiple Approvers */}
            <div className="form-group">
              <label>Penandatangan (Approver) * <button className="btn btn-ghost btn-sm" style={{marginLeft:8}} onClick={() => setApproverIds([...approverIds, 0])}><Plus size={12}/> Tambah</button></label>
              {approverIds.map((aid, i) => (
                <div key={i} style={{display:'flex',gap:8,marginBottom:6}}>
                  <select className="form-control" value={aid} onChange={e => { const arr = [...approverIds]; arr[i] = Number(e.target.value); setApproverIds(arr); }}>
                    <option value={0}>Pilih Penandatangan...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name} - {u.position?.name || u.role}</option>)}
                  </select>
                  {approverIds.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setApproverIds(approverIds.filter((_, j) => j !== i))}><Trash2 size={14}/></button>
                  )}
                </div>
              ))}
              {approverIds.filter(id => id > 0).length > 0 && (
                <p style={{fontSize:12,color:'var(--color-text-muted)'}}>
                  ℹ️ Urutan approver: {approverIds.filter(id => id > 0).map((aid, i) => {
                    const u = users.find(u => u.id === aid);
                    return `#${i+1} ${u?.full_name || '-'}`;
                  }).join(' → ')}
                </p>
              )}
            </div>

            {/* Single Publisher */}
            <div className="form-group">
              <label>Distribusi (Publisher) (Opsional)</label>
              <select className="form-control" value={form.publisher_id} onChange={e => setForm({...form, publisher_id: Number(e.target.value)})}>
                <option value={0}>Pilih Publisher...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name} - {u.position?.name || u.role}</option>)}
              </select>
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', gap: 10, marginTop: 20}}>
              <button className="btn btn-primary" disabled={!canProceed} onClick={() => setStep(2)}>
                Selanjutnya <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Recipients */}
      {step === 2 && (
        <div className="card">
          <div className="card-header"><h3>Pilih Penerima Surat</h3></div>
          <div className="card-body">
            <div className="tabs">
              {['personal','organization','position','group'].map(t => (
                <button key={t} className={`tab ${recipientTab === t ? 'active' : ''}`}
                  onClick={() => setRecipientTab(t)}>
                  {t === 'personal' ? 'Personal' : t === 'organization' ? 'Organisasi' : t === 'position' ? 'Jabatan' : 'Group'}
                </button>
              ))}
            </div>

            <div style={{maxHeight:200,overflowY:'auto',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',marginBottom:16}}>
              {recipientTab === 'personal' && users.map(u => (
                <button key={u.id} className="variable-menu-item" onClick={() => addRecipient('personal', u.id, u.full_name)}>
                  {u.full_name} <span style={{fontSize:11,color:'var(--color-text-muted)'}}>{u.position?.name}</span>
                </button>
              ))}
              {recipientTab === 'organization' && orgs.map(o => (
                <button key={o.id} className="variable-menu-item" onClick={() => addRecipient('organization', o.id, o.name)}>
                  [{o.code}] {o.name}
                </button>
              ))}
              {recipientTab === 'position' && positions.map(p => (
                <button key={p.id} className="variable-menu-item" onClick={() => addRecipient('position', p.id, p.name)}>
                  {p.name}
                </button>
              ))}
              {recipientTab === 'group' && groups.map(g => (
                <button key={g.id} className="variable-menu-item" onClick={() => addRecipient('group', g.id, g.name)}>
                  {g.name}
                </button>
              ))}
            </div>

            {recipients.length > 0 && (
              <div style={{marginBottom:16}}>
                <label style={{fontSize:13,fontWeight:600,marginBottom:8,display:'block'}}>Penerima Terpilih ({recipients.length})</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {recipients.map((r, i) => (
                    <span key={i} className="badge badge-primary" style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px'}}>
                      {r.recipient_name} <span style={{fontSize:10,opacity:0.7}}>({r.recipient_type})</span>
                      <button onClick={() => removeRecipient(i)} style={{border:'none',background:'none',cursor:'pointer',padding:0}}><X size={12}/></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:'flex', justifyContent:'space-between', marginTop: 20}}>
              <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={16}/> Kembali</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Selanjutnya <ArrowRight size={16}/></button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Editor */}
      {step === 3 && (
        <div className="card">
          <div className="card-header">
            <h3>Editor Surat</h3>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {form.content_html && (
                <span style={{fontSize:12,color:'var(--color-success)',display:'flex',alignItems:'center',gap:4}}>
                  <FileText size={13}/> Template dimuat
                </span>
              )}
              <div className="variable-inserter">
                <button className="btn btn-outline btn-sm" onClick={() => setShowVarMenu(!showVarMenu)}>
                  <Zap size={14}/> Insert Variable
                </button>
                {showVarMenu && (
                  <div className="variable-menu">
                    {VARIABLES.map(v => (
                      <button key={v.key} className="variable-menu-item" onClick={() => insertVariable(v.key)}>
                        <span>{v.label}</span>
                        <code>${'{' + v.key + '}'}</code>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Variable reference info */}
          <div style={{background:'var(--bg-subtle)',padding:'10px 20px',borderBottom:'1px solid var(--border-color)',fontSize:12,color:'var(--color-text-muted)'}}>
            💡 <strong>Tips:</strong> Gunakan "Insert Variable" untuk menambahkan variabel otomatis seperti <code>{'${nomor_surat}'}</code>, <code>{'${tanggal}'}</code>, <code>{'${qrcode}'}</code>, dll. Variabel akan otomatis terisi saat surat disetujui.
          </div>

          <div className="card-body" style={{padding:0}}>
            <div className="letter-editor-wrapper">
              <Editor
                onInit={(_evt, editor) => editorRef.current = editor}
                apiKey="4ie9bb1953z5fgryel9wmax7g4eh2vtanggekprjw1rkxfay"
                initialValue={form.content_html}
                init={{
                  height: 620,
                  menubar: 'file edit view insert format table',
                  plugins: 'lists link table code wordcount image',
                  toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | outdent indent | table | code',
                  content_style: `
                    body { font-family: 'Times New Roman', serif; font-size: 12pt; padding: 20px 40px; max-width: 21cm; margin: 0 auto; background: #fff; }
                    p { margin: 0 0 8px 0; line-height: 1.6; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #ddd; padding: 8px; }
                    span[style*="color:#0066cc"] { display: inline-block; }
                  `,
                  branding: false,
                  statusbar: false,
                }}
              />
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', padding: 20, borderTop: '1px solid var(--color-border)'}}>
            <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16}/> Kembali</button>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-outline" onClick={handleSaveDraft}>Simpan Draft</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                <Send size={16}/> Submit Surat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
