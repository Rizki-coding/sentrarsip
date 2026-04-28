import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Letter, WorkflowLog, User, Disposition, LetterForward } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, CheckCircle, XCircle, Edit3, FileText, Forward, ArrowDownRight, Plus, X, Edit, RotateCcw, Lock, ShieldCheck, Stamp, BookOpen, Clock, UserCheck, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import FeedbackModal from '../../components/ui/FeedbackModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_review: 'Menunggu Review', revision: 'Revisi',
  pending_sign: 'Menunggu TTD', signed: 'Ditandatangani', published: 'Diterbitkan',
};

export default function LetterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [letter, setLetter] = useState<Letter | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [revisionCount, setRevisionCount] = useState(0);
  const [dispositions, setDispositions] = useState<Disposition[]>([]);
  const [forwards, setForwards] = useState<LetterForward[]>([]);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('detail');
  const [previewHtml, setPreviewHtml] = useState('');

  // Disposition modal state
  const [showDispoModal, setShowDispoModal] = useState(false);
  const [subordinates, setSubordinates] = useState<User[]>([]);
  const [dispoForm, setDispoForm] = useState({ to_user_id: 0, instruction: '', priority: 'biasa', deadline: '' });

  // Forward modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [sameOrgUsers, setSameOrgUsers] = useState<User[]>([]);
  const [forwardForm, setForwardForm] = useState({ to_user_id: 0, notes: '' });

  // Revise modal state
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [reviseComment, setReviseComment] = useState('');

  // Feedback Modal
  const [modal, setModal] = useState({ isOpen: false, type: 'success' as 'success'|'error'|'warning', title: '', message: '', actionLabel: '', onAction: null as any });

  // Confirm modal state
  const [confirm, setConfirm] = useState({ isOpen: false, type: 'info' as 'info'|'warning'|'danger'|'success', title: '', message: '', confirmLabel: '', action: '' });

  useEffect(() => { fetchLetter(); }, [id]);

  const fetchLetter = async () => {
    const [letterRes, logsRes, stepsRes, dispoRes, fwdRes, previewRes] = await Promise.all([
      api.get(`/letters/${id}`),
      api.get(`/letters/${id}/history`),
      api.get(`/letters/${id}/workflow-steps`).catch(() => ({ data: { steps: [], logs: [] } })),
      api.get(`/letters/${id}/dispositions`),
      api.get(`/letters/${id}/forwards`),
      api.get(`/letters/${id}/preview`, { responseType: 'text' }).catch(() => ({ data: '' }))
    ]);
    setLetter(letterRes.data);
    setLogs(logsRes.data || []);
    setWorkflowSteps(stepsRes.data?.steps || []);
    setRevisionCount(stepsRes.data?.revision_count || 0);
    setDispositions(dispoRes.data || []);
    setForwards(fwdRes.data || []);
    setPreviewHtml(previewRes.data || '');
  };

  const openDispoModal = async () => {
    const res = await api.get('/users/subordinates');
    setSubordinates(res.data || []);
    setDispoForm({ to_user_id: 0, instruction: '', priority: 'biasa', deadline: '' });
    setShowDispoModal(true);
  };

  const handleCreateDispo = async () => {
    try {
      await api.post('/dispositions', { ...dispoForm, letter_id: Number(id) });
      toast.success('Disposisi dikirim');
      setShowDispoModal(false);
      fetchLetter();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const openForwardModal = async () => {
    const res = await api.get('/users/same-org');
    setSameOrgUsers(res.data || []);
    setForwardForm({ to_user_id: 0, notes: '' });
    setShowForwardModal(true);
  };

  const handleForward = async () => {
    try {
      await api.post(`/letters/${id}/forward`, forwardForm);
      toast.success('Surat diteruskan');
      setShowForwardModal(false);
      fetchLetter();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const markDispoDone = async (did: number) => {
    await api.put(`/dispositions/${did}`, { status: 'done' });
    toast.success('Disposisi diselesaikan');
    fetchLetter();
  };

  const showConfirm = (action: string) => {
    const configs: Record<string, { type: 'info'|'warning'|'danger'|'success', title: string, message: string, confirmLabel: string }> = {
      submit: { type: 'info', title: 'Submit Surat?', message: 'Surat akan dikirim untuk diproses ke tahap selanjutnya. Anda tidak dapat mengedit surat setelah disubmit.', confirmLabel: 'Ya, Submit' },
      approve: { type: 'success', title: 'Setujui Surat?', message: 'Anda yakin ingin menyetujui surat ini? Surat akan diteruskan ke pemeriksa/penandatangan berikutnya.', confirmLabel: 'Ya, Setujui' },
      reject: { type: 'warning', title: 'Minta Revisi?', message: 'Surat akan dikembalikan ke maker untuk direvisi. Seluruh flow approval akan dimulai ulang dari awal.', confirmLabel: 'Ya, Minta Revisi' },
      sign: { type: 'success', title: 'Tanda Tangani Surat?', message: 'Anda yakin ingin menandatangani surat ini secara digital? QR Code tanda tangan akan diterbitkan.', confirmLabel: 'Ya, Tanda Tangani' },
      publish: { type: 'info', title: 'Terbitkan Surat?', message: 'Surat akan diterbitkan dan didistribusikan ke seluruh penerima tujuan. Proses ini tidak dapat dibatalkan.', confirmLabel: 'Ya, Terbitkan' },
    };
    const cfg = configs[action];
    if (!cfg) return;
    if (action === 'reject' && !comment) { toast.error('Masukkan catatan revisi terlebih dahulu'); return; }
    setConfirm({ isOpen: true, ...cfg, action });
  };

  const executeAction = async (action: string) => {
    setConfirm({ ...confirm, isOpen: false });
    try {
      switch (action) {
        case 'submit':
          await api.post(`/letters/${id}/submit`);
          setModal({ isOpen: true, type: 'success', title: 'Surat Disubmit', message: 'Surat berhasil disubmit untuk diproses ke tahap selanjutnya.', actionLabel: 'Tutup', onAction:()=>setModal({...modal, isOpen:false})});
          break;
        case 'approve':
          await api.post(`/letters/${id}/review`, { action: 'approve', comments: comment });
          setModal({ isOpen: true, type: 'success', title: 'Surat Disetujui', message: 'Anda telah menyetujui surat ini. Surat akan diteruskan ke pemeriksa/penandatangan berikutnya.', actionLabel: 'Tutup', onAction:()=>setModal({...modal, isOpen:false})});
          break;
        case 'reject':
          await api.post(`/letters/${id}/review`, { action: 'reject', comments: comment });
          setModal({ isOpen: true, type: 'warning', title: 'Surat Ditolak', message: 'Surat dikembalikan ke maker untuk direvisi berdasarkan catatan Anda.', actionLabel: 'Tutup', onAction:()=>setModal({...modal, isOpen:false})});
          break;
        case 'sign':
          await api.post(`/letters/${id}/sign`);
          setModal({ isOpen: true, type: 'success', title: 'Ditandatangani', message: 'Surat berhasil ditandatangani dan QR Code digital telah diterbitkan.', actionLabel: 'Tutup', onAction:()=>setModal({...modal, isOpen:false})});
          break;
        case 'publish':
          await api.post(`/letters/${id}/publish`);
          setModal({ isOpen: true, type: 'success', title: 'Surat Diterbitkan', message: 'Surat telah diterbitkan dan akan didistribusikan ke seluruh penerima tujuan.', actionLabel: 'Kembali', onAction:()=>navigate(-1)});
          break;
      }
      setComment('');
      fetchLetter();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleRevise = async () => {
    if (!reviseComment.trim()) { toast.error('Catatan revisi wajib diisi'); return; }
    try {
      await api.post(`/letters/${id}/revise`, { comments: reviseComment });
      setModal({ isOpen: true, type: 'warning', title: 'Surat Direvisi', message: 'Surat dikembalikan ke maker untuk direvisi.', actionLabel: 'Kembali', onAction:()=>navigate('/workflow') });
      setShowReviseModal(false);
      setReviseComment('');
      fetchLetter();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  if (!letter) return <div className="loading-spinner"><div className="spinner"/></div>;

  const isSuperadmin = user?.role === 'superadmin';
  const canSubmit = (letter.created_by === user?.id || isSuperadmin) && ['draft', 'revision'].includes(letter.status);
  // Sequential: only the checker AT the current index can review
  const currentCheckerIndex = letter.current_checker_index ?? 0;
  const currentApproverIndex = letter.current_approver_index ?? 0;
  const currentChecker = letter.checkers?.[currentCheckerIndex];
  const currentApprover = letter.approvers?.[currentApproverIndex];
  const canReview = (currentChecker?.id === user?.id || isSuperadmin) && letter.status === 'pending_review';
  const canSign = (currentApprover?.id === user?.id || isSuperadmin) && letter.status === 'pending_sign';
  const canRevise = (currentApprover?.id === user?.id || isSuperadmin) && letter.status === 'pending_sign'; // Approver can also request revision
  const canPublish = (letter.publisher_id === user?.id || isSuperadmin) && letter.status === 'signed';
  const isRecipient = letter.recipients?.some(r => r.recipient_type === 'personal' && r.recipient_id === user?.id);
  const isMaker = letter.created_by === user?.id;

  // View-only logic
  const isDoneMaker = !canSubmit && isMaker && !['draft','revision'].includes(letter.status);
  const isPastChecker = letter.checkers?.some((c, i) => c.id === user?.id && i < currentCheckerIndex) && !canReview;
  const isPastApprover = letter.approvers?.some((a, i) => a.id === user?.id && i < currentApproverIndex) && !canSign;
  const isViewOnlyLocked = isDoneMaker || isPastChecker || isPastApprover;
  
  let currentOwnerName = '-';
  if (letter.status === 'pending_review' && currentChecker) currentOwnerName = `Checker #${currentCheckerIndex + 1}: ${currentChecker.full_name}`;
  if (letter.status === 'pending_sign' && currentApprover) currentOwnerName = `Approver #${currentApproverIndex + 1}: ${currentApprover.full_name}`;
  if (letter.status === 'signed') currentOwnerName = `Publisher`; // Publisher might not be populated in relations, but we know it's signed
  if (letter.status === 'published') currentOwnerName = 'Semua Penerima (Selesai)';

  const hasAnyActions = canSubmit || canReview || canSign || canPublish || isViewOnlyLocked;

  return (
    <div>
      <Toaster position="top-right" />
      <ConfirmModal
        isOpen={confirm.isOpen}
        type={confirm.type}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        onConfirm={() => executeAction(confirm.action)}
        onCancel={() => setConfirm({...confirm, isOpen: false})}
      />
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
          <h1>{letter.subject}</h1>
          <p>{letter.letter_number} · <span className={`badge status-${letter.status}`}>{statusLabels[letter.status]}</span></p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate(-1)}><ArrowLeft size={16}/> Kembali</button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'detail' ? 'active' : ''}`} onClick={() => setActiveTab('detail')}>Detail Surat</button>
        <button className={`tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Riwayat Workflow</button>
        <button className={`tab ${activeTab === 'disposisi' ? 'active' : ''}`} onClick={() => setActiveTab('disposisi')}>
          Disposisi {dispositions.length > 0 && <span className="badge badge-info" style={{marginLeft:4}}>{dispositions.length}</span>}
        </button>
        <button className={`tab ${activeTab === 'forward' ? 'active' : ''}`} onClick={() => setActiveTab('forward')}>
          Teruskan {forwards.length > 0 && <span className="badge badge-info" style={{marginLeft:4}}>{forwards.length}</span>}
        </button>
      </div>

      {activeTab === 'detail' && (
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap: 20}}>
          <div className="card">
            <div className="card-header"><h3>Informasi Surat</h3></div>
            <div className="card-body">
              <table>
                <tbody>
                  <tr><td style={{fontWeight:600,width:160}}>Nomor Surat</td><td>{letter.letter_number}</td></tr>
                  <tr><td style={{fontWeight:600}}>Jenis Surat</td><td>{letter.letter_type?.name}</td></tr>
                  <tr><td style={{fontWeight:600}}>Arah</td><td><span className={`badge ${letter.direction === 'masuk' ? 'badge-info' : 'badge-warning'}`}>{letter.direction === 'masuk' ? 'Masuk' : 'Keluar'}</span></td></tr>
                  <tr><td style={{fontWeight:600}}>Perihal</td><td>{letter.subject}</td></tr>
                  <tr><td style={{fontWeight:600}}>Tanggal</td><td>{letter.letter_date ? new Date(letter.letter_date).toLocaleDateString('id-ID') : '-'}</td></tr>
                  <tr><td style={{fontWeight:600}}>Pembuat</td><td>{letter.creator?.full_name}</td></tr>
                  <tr><td style={{fontWeight:600}}>Penerima</td><td>{letter.recipients?.map(r => r.recipient_name).join(', ') || '-'}</td></tr>
                  <tr><td style={{fontWeight:600}}>Checker</td><td>{letter.checkers?.map(c => c.full_name).join(', ') || '-'}</td></tr>
                  <tr><td style={{fontWeight:600}}>Approver</td><td>{letter.approvers?.map(a => a.full_name).join(', ') || '-'}</td></tr>
                  <tr><td style={{fontWeight:600}}>Publisher</td><td>{letter.publisher?.full_name || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Panel */}
          {hasAnyActions && (
          <div className="card">
            <div className="card-header"><h3>Aksi Workflow</h3></div>
            <div className="card-body">
              {isViewOnlyLocked && (
                <div style={{display:'flex',gap:12,padding:'14px 16px',background:'rgba(59,130,246,0.05)',borderRadius:'var(--radius-md)',marginBottom:16,border:'1px solid rgba(59,130,246,0.2)'}}>
                  <Lock size={20} style={{color:'var(--color-primary)'}}/>
                  <div>
                    <h4 style={{fontSize:13,color:'var(--color-primary)',marginBottom:4}}>Mode View-Only</h4>
                    <p style={{fontSize:12,color:'var(--color-text-muted)',lineHeight:1.4}}>
                      Proses bagian Anda telah selesai. Surat saat ini sedang berada di antrian <strong>{currentOwnerName}</strong>. 
                      Anda hanya dapat memantau perkembangan surat ini.
                    </p>
                  </div>
                </div>
              )}
              {canSubmit && (
                <>
                  {/* Edit button for drafts/revisions */}
                  <button className="btn btn-outline" style={{width:'100%',marginBottom:8}}
                    onClick={() => navigate(`/surat/${letter.letter_type?.letter_category?.code || letter.direction}/edit/${id}`)}
                  >
                    <Edit size={16}/> Edit Surat
                  </button>
                  <button className="btn btn-primary" style={{width:'100%',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontWeight:600}} onClick={() => showConfirm('submit')}>
                    <Send size={16}/> Submit untuk Review
                  </button>
                </>
              )}
              {canReview && (
                <>
                  <div className="form-group">
                    <label>Catatan</label>
                    <textarea className="form-control" value={comment} onChange={e => setComment(e.target.value)} placeholder="Tambahkan catatan..." />
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-success" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}} onClick={() => showConfirm('approve')}>
                      <CheckCircle size={16}/> Setujui
                    </button>
                    <button className="btn btn-warning" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}} onClick={() => showConfirm('reject')}>
                      <RotateCcw size={16}/> Minta Revisi
                    </button>
                  </div>
                </>
              )}
              {canSign && (
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  <button className="btn btn-success" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}} onClick={() => showConfirm('sign')}>
                    <Stamp size={16}/> Tanda Tangan Digital
                  </button>
                  <button className="btn btn-warning" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontWeight:600}} onClick={() => setShowReviseModal(true)}>
                    <RotateCcw size={16}/> Minta Revisi
                  </button>
                </div>
              )}
              {canPublish && (
                <button className="btn btn-primary" style={{width:'100%',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontWeight:600,background:'linear-gradient(135deg, var(--color-primary), #6366f1)',border:'none'}} onClick={() => showConfirm('publish')}>
                  <BookOpen size={16}/> Terbitkan Surat
                </button>
              )}

              <hr style={{margin:'12px 0', borderColor:'var(--color-border)'}} />

              {/* Current workflow step indicator */}
              {letter.status === 'pending_review' && currentChecker && (
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:8,padding:'8px',background:'var(--bg-subtle)',borderRadius:'var(--radius-sm)'}}>
                  ⏳ Menunggu review dari: <strong>{currentChecker.full_name}</strong> (Checker #{currentCheckerIndex + 1})
                </div>
              )}
              {letter.status === 'pending_sign' && currentApprover && (
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:8,padding:'8px',background:'var(--bg-subtle)',borderRadius:'var(--radius-sm)'}}>
                  ✍️ Menunggu tanda tangan dari: <strong>{currentApprover.full_name}</strong> (Approver #{currentApproverIndex + 1})
                </div>
              )}

              {/* Disposisi & Forward: hanya muncul untuk penerima surat yang sudah published */}
              {letter.status === 'published' && (isRecipient || isSuperadmin) && (
                <>
                  <button className="btn btn-outline" style={{width:'100%',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={openForwardModal}>
                    <Forward size={16}/> Teruskan Surat
                  </button>
                  <button className="btn btn-outline" style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:6}} onClick={openDispoModal}>
                    <ArrowDownRight size={16}/> Buat Disposisi
                  </button>
                </>
              )}

              {letter.qr_code_path && (
                <div style={{marginTop:20, textAlign:'center'}}>
                  <p style={{fontSize:12,fontWeight:600,marginBottom:8}}>QR Code Tanda Tangan Digital</p>
                  <img src={`http://localhost:8080/${letter.qr_code_path}`} alt="QR Code" style={{width:150,height:150}} />
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="card" style={{ minHeight: '850px' }}>
          <iframe 
            srcDoc={previewHtml}
            style={{ width: '100%', height: '800px', border: 'none', background: 'white', borderRadius: 'var(--radius-md)' }}
            title="Preview Surat"
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* Workflow Pipeline Stepper */}
          <div className="card">
            <div className="card-header">
              <h3>Pipeline Workflow</h3>
              {revisionCount > 0 && (
                <span className="badge badge-warning" style={{fontSize:11}}>Revisi ke-{revisionCount}</span>
              )}
            </div>
            <div className="card-body">
              {workflowSteps.length === 0 && <div className="empty-state"><p>Belum ada data workflow</p></div>}
              {workflowSteps.map((step: any, idx: number) => {
                const isLast = idx === workflowSteps.length - 1;
                const roleLabels: Record<string,string> = { maker: 'Pembuat', checker: 'Pemeriksa', approver: 'Penandatangan', publisher: 'Penerbit' };
                const roleColors: Record<string,string> = {
                  maker: '#6366f1', checker: '#f59e0b', approver: '#22c55e', publisher: '#3b82f6'
                };
                const statusIcons: Record<string, any> = {
                  done: <CheckCircle size={18} style={{color:'#22c55e'}} />,
                  current: <Clock size={18} style={{color:'#f59e0b'}} />,
                  waiting: <div style={{width:18,height:18,borderRadius:'50%',border:'2px dashed var(--color-border)'}} />,
                };
                const actionLabels: Record<string,string> = {
                  create: 'Dibuat', submit: 'Disubmit', approve: 'Disetujui', reject: 'Ditolak',
                  sign: 'Ditandatangani', revise: 'Diminta Revisi', publish: 'Diterbitkan'
                };
                return (
                  <div key={idx} style={{display:'flex',gap:16,position:'relative'}}>
                    {/* Vertical line connector */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:24}}>
                      <div style={{
                        width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                        background: step.status === 'done' ? 'rgba(34,197,94,0.1)' : step.status === 'current' ? 'rgba(245,158,11,0.1)' : 'var(--bg-subtle)',
                        border: step.status === 'current' ? '2px solid var(--color-warning)' : step.status === 'done' ? '2px solid #22c55e' : '2px solid var(--color-border)',
                        flexShrink:0, zIndex:1
                      }}>
                        {statusIcons[step.status]}
                      </div>
                      {!isLast && (
                        <div style={{width:2,flex:1,background: step.status === 'done' ? '#22c55e' : 'var(--color-border)',minHeight:20}} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{flex:1,paddingBottom: isLast ? 0 : 20}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{
                          fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',
                          color: roleColors[step.role] || 'var(--color-text-muted)',
                          background: `${roleColors[step.role] || '#888'}15`,
                          padding:'2px 8px',borderRadius:4
                        }}>
                          {roleLabels[step.role] || step.role} #{step.order}
                        </span>
                        {step.status === 'current' && step.action !== 'revision' && (
                          <span style={{fontSize:10,fontWeight:600,color:'var(--color-warning)',background:'rgba(245,158,11,0.1)',padding:'2px 8px',borderRadius:4,animation:'pulse 2s infinite'}}>
                            ⏳ Menunggu
                          </span>
                        )}
                        {step.status === 'current' && step.action === 'revision' && (
                          <span style={{fontSize:10,fontWeight:600,color:'var(--color-danger)',background:'rgba(239,68,68,0.1)',padding:'2px 8px',borderRadius:4}}>
                            🔄 Perlu Revisi
                          </span>
                        )}
                      </div>
                      <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{step.user_name}</div>
                      {step.status === 'done' && (
                        <div style={{fontSize:12,color:'var(--color-text-muted)'}}>
                          <span style={{color:'#22c55e',fontWeight:500}}>{actionLabels[step.action] || step.action}</span>
                          {step.action_at && (
                            <span> · {new Date(step.action_at).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                          )}
                        </div>
                      )}
                      {step.status === 'done' && step.comments && (
                        <div style={{fontSize:12,color:'var(--color-text-muted)',marginTop:4,fontStyle:'italic'}}>💬 {step.comments}</div>
                      )}
                      {step.status === 'current' && step.comments && (
                        <div style={{fontSize:12,color:'var(--color-danger)',marginTop:4,padding:'6px 10px',background:'rgba(239,68,68,0.05)',borderRadius:'var(--radius-sm)',border:'1px solid rgba(239,68,68,0.15)'}}>
                          ⚠️ {step.comments}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Log */}
          <div className="card">
            <div className="card-header"><h3>Log Aktivitas</h3></div>
            <div className="card-body">
              <div className="timeline">
                {logs.map(log => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-date">{new Date(log.created_at).toLocaleString('id-ID')}</div>
                    <div className="timeline-title">
                      <span className={`badge status-${log.to_status}`} style={{marginRight:8}}>{statusLabels[log.to_status] || log.to_status}</span>
                      oleh <strong>{log.user?.full_name}</strong>
                    </div>
                    {log.comments && <div className="timeline-desc">{log.comments}</div>}
                  </div>
                ))}
                {logs.length === 0 && <div className="empty-state"><p>Belum ada riwayat</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'disposisi' && (
        <div className="card">
          <div className="card-header">
            <h3>Disposisi Surat</h3>
            {(isRecipient || isSuperadmin) && (
              <button className="btn btn-primary btn-sm" onClick={openDispoModal}><Plus size={14}/> Buat Disposisi</button>
            )}
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Dari</th><th>Kepada</th><th>Instruksi</th><th>Prioritas</th><th>Deadline</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {dispositions.map(d => (
                  <tr key={d.id}>
                    <td>{d.from_user?.full_name}</td>
                    <td>{d.to_user?.full_name}</td>
                    <td>{d.instruction}</td>
                    <td><span className={`badge ${d.priority === 'penting' ? 'badge-error' : d.priority === 'segera' ? 'badge-warning' : 'badge-default'}`}>{d.priority}</span></td>
                    <td>{d.deadline ? new Date(d.deadline).toLocaleDateString('id-ID') : '-'}</td>
                    <td><span className={`badge ${d.status === 'done' ? 'badge-success' : d.status === 'read' ? 'badge-info' : 'badge-warning'}`}>{d.status}</span></td>
                    <td>
                      {d.status !== 'done' && d.to_user_id === user?.id && (
                        <button className="btn btn-success btn-sm" onClick={() => markDispoDone(d.id)}><CheckCircle size={13}/> Selesai</button>
                      )}
                    </td>
                  </tr>
                ))}
                {dispositions.length === 0 && <tr><td colSpan={7} className="empty-state"><p>Belum ada disposisi</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'forward' && (
        <div className="card">
          <div className="card-header">
            <h3>Riwayat Teruskan</h3>
            <button className="btn btn-primary btn-sm" onClick={openForwardModal}><Forward size={14}/> Teruskan</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Dari</th><th>Kepada</th><th>Catatan</th><th>Tanggal</th></tr></thead>
              <tbody>
                {forwards.map(f => (
                  <tr key={f.id}>
                    <td>{f.from_user?.full_name}</td>
                    <td>{f.to_user?.full_name}</td>
                    <td>{f.notes || '-'}</td>
                    <td>{new Date(f.created_at).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                {forwards.length === 0 && <tr><td colSpan={4} className="empty-state"><p>Belum ada forward</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disposition Modal */}
      {showDispoModal && (
        <div className="modal-overlay" onClick={() => setShowDispoModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Buat Disposisi</h2>
              <button className="btn btn-ghost" onClick={() => setShowDispoModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Ditujukan Kepada (Bawahan)</label>
                <select className="form-control" value={dispoForm.to_user_id} onChange={e => setDispoForm({...dispoForm, to_user_id: Number(e.target.value)})}>
                  <option value={0}>Pilih user...</option>
                  {subordinates.map(u => <option key={u.id} value={u.id}>{u.full_name} — {u.position?.name} ({u.organization?.name})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Instruksi</label><textarea className="form-control" value={dispoForm.instruction} onChange={e => setDispoForm({...dispoForm, instruction: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Prioritas</label>
                  <select className="form-control" value={dispoForm.priority} onChange={e => setDispoForm({...dispoForm, priority: e.target.value})}>
                    <option value="biasa">Biasa</option><option value="segera">Segera</option><option value="penting">Penting</option>
                  </select>
                </div>
                <div className="form-group"><label>Deadline</label><input className="form-control" type="date" value={dispoForm.deadline} onChange={e => setDispoForm({...dispoForm, deadline: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDispoModal(false)}>Batal</button>
              <button className="btn btn-primary" disabled={!dispoForm.to_user_id} onClick={handleCreateDispo}>Kirim Disposisi</button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="modal-overlay" onClick={() => setShowForwardModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Teruskan Surat</h2>
              <button className="btn btn-ghost" onClick={() => setShowForwardModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Kepada (Organisasi yang sama)</label>
                <select className="form-control" value={forwardForm.to_user_id} onChange={e => setForwardForm({...forwardForm, to_user_id: Number(e.target.value)})}>
                  <option value={0}>Pilih user...</option>
                  {sameOrgUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} — {u.position?.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Catatan</label><textarea className="form-control" value={forwardForm.notes} onChange={e => setForwardForm({...forwardForm, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForwardModal(false)}>Batal</button>
              <button className="btn btn-primary" disabled={!forwardForm.to_user_id} onClick={handleForward}>Teruskan</button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Modal */}
      {showReviseModal && (
        <div className="modal-overlay" onClick={() => setShowReviseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Minta Revisi ke Maker</h2>
              <button className="btn btn-ghost" onClick={() => setShowReviseModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div style={{background:'rgba(245,158,11,0.1)',borderRadius:'var(--radius-sm)',padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--color-warning)'}}>
                ⚠️ Surat akan dikembalikan ke <strong>{letter?.creator?.full_name}</strong> (Maker) untuk diperbaiki. Seluruh flow akan dimulai ulang dari awal.
              </div>
              <div className="form-group">
                <label>Catatan Revisi * <span style={{color:'var(--color-danger)',fontSize:12}}>(wajib diisi)</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={reviseComment}
                  onChange={e => setReviseComment(e.target.value)}
                  placeholder="Tuliskan catatan apa yang perlu diperbaiki oleh maker..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReviseModal(false)}>Batal</button>
              <button className="btn btn-warning" disabled={!reviseComment.trim()} onClick={handleRevise}>
                <RotateCcw size={15}/> Kirim Revisi ke Maker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
