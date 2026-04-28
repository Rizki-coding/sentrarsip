import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { Letter, LetterCategory, LetterType } from '../../types';
import { Plus, Search, Eye, Edit, CheckCircle, Edit3, FileText, Clock, Stamp, BookOpen, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_review: 'Menunggu Review', revision: 'Revisi',
  pending_sign: 'Menunggu TTD', signed: 'Ditandatangani', published: 'Diterbitkan',
};

// Returns detailed workflow position info
function getWorkflowPosition(letter: Letter) {
  const checkerIdx = letter.current_checker_index ?? 0;
  const approverIdx = letter.current_approver_index ?? 0;
  const currentChecker = letter.checkers?.[checkerIdx];
  const currentApprover = letter.approvers?.[approverIdx];

  switch (letter.status) {
    case 'draft':
      return { label: 'Draft — Belum disubmit', person: letter.creator?.full_name || '', icon: Edit3, color: '#94a3b8' };
    case 'revision':
      return { label: 'Revisi — Perlu diperbaiki', person: letter.creator?.full_name || '', icon: Edit3, color: '#f59e0b' };
    case 'pending_review':
      return {
        label: `Menunggu Checker ${checkerIdx + 1}/${letter.checkers?.length || 0}`,
        person: currentChecker?.full_name || '-',
        icon: Search, color: '#f59e0b'
      };
    case 'pending_sign':
      return {
        label: `Menunggu Approver ${approverIdx + 1}/${letter.approvers?.length || 0}`,
        person: currentApprover?.full_name || '-',
        icon: Stamp, color: '#8b5cf6'
      };
    case 'signed':
      if (letter.publisher_id && letter.publisher) {
        return { label: 'Menunggu Publisher', person: letter.publisher?.full_name || '-', icon: BookOpen, color: '#3b82f6' };
      }
      return { label: 'Sudah Diapprove', person: '-', icon: CheckCircle, color: '#22c55e' };
    case 'published':
      return { label: 'Selesai — Diterbitkan', person: '-', icon: CheckCircle, color: '#22c55e' };
    default:
      return { label: letter.status, person: '-', icon: Clock, color: '#94a3b8' };
  }
}

export default function LetterList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categoryCode } = useParams();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [directionTab, setDirectionTab] = useState('all');
  const [category, setCategory] = useState<LetterCategory | null>(null);
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);

  useEffect(() => {
    if (categoryCode) {
      api.get('/letter-categories').then(r => {
        const cats: LetterCategory[] = r.data || [];
        const cat = cats.find(c => c.code === categoryCode);
        setCategory(cat || null);
      });
      api.get('/letter-types').then(r => {
        const types: LetterType[] = r.data || [];
        setLetterTypes(categoryCode ? types.filter(t => {
          // Will be filtered by category once the data has letter_category_id
          return true;
        }) : types);
      });
    }
  }, [categoryCode]);

  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  useEffect(() => {
    if (viewParam === 'inbox') setDirectionTab('inbox');
    else if (!viewParam && directionTab === 'inbox') setDirectionTab('all');
  }, [viewParam]);

  useEffect(() => { fetchLetters(); }, [page, search, filterStatus, directionTab, category]);

  const fetchLetters = async () => {
    const params: any = { page, limit: 10 };
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    
    if (directionTab === 'inbox') {
      params.inbox = 'true';
    } else if (directionTab && directionTab !== 'all') {
      params.direction = directionTab;
    }

    if (category && category.code !== 'all') {
      const typesInCategory = letterTypes.filter(lt => lt.letter_category_id === category.id);
      if (typesInCategory.length > 0) {
        params.letter_type_ids = typesInCategory.map(t => t.id).join(',');
      }
    }
    const res = await api.get('/letters', { params });
    setLetters(res.data.data || []);
    setTotal(res.data.total);
  };

  const totalPages = Math.ceil(total / 10);
  const pageTitle = category?.name || 'Semua Surat';
  const createPath = categoryCode ? `/surat/${categoryCode}/create` : '/letters/create';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>Daftar surat dan status workflow</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(createPath)}>
          <Plus size={16}/> Buat Surat
        </button>
      </div>

      <div className="card">
        <div className="tab-nav">
          <button className={`tab-item ${directionTab === 'all' ? 'active' : ''}`} onClick={() => setDirectionTab('all')}>Semua</button>
          <button className={`tab-item ${directionTab === 'inbox' ? 'active' : ''}`} onClick={() => setDirectionTab('inbox')}>Perlu Tindakan</button>
        </div>

        <div className="toolbar">
          <div className="search-box"><Search /><input placeholder="Cari perihal, nomor surat..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Semua Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead><tr><th>Nomor</th><th>Perihal</th><th>Jenis</th><th>Status</th><th>Posisi Saat Ini</th><th>Pembuat</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody>
              {letters.map(l => {
                const checkerIdx = l.current_checker_index ?? 0;
                const approverIdx = l.current_approver_index ?? 0;
                const currentChecker = l.checkers?.[checkerIdx];
                const currentApprover = l.approvers?.[approverIdx];

                const isMyTurn =
                  (l.status === 'pending_review' && currentChecker?.id === user?.id) ||
                  (l.status === 'pending_sign' && currentApprover?.id === user?.id) ||
                  (l.status === 'signed' && l.publisher_id === user?.id);

                const wf = getWorkflowPosition(l);
                const WfIcon = wf.icon;

                return (
                  <tr key={l.id} style={isMyTurn ? { background: 'rgba(59,130,246,0.05)' } : undefined}>
                    <td style={{fontWeight:600, fontSize:12, fontFamily:'monospace'}}>
                      {l.letter_number}
                      {isMyTurn && <div style={{color:'var(--color-primary)', fontSize:10, marginTop:2, fontWeight:600}}>⚡ Giliran Anda</div>}
                    </td>
                    <td>{l.subject}</td>
                    <td>{l.letter_type?.name}</td>
                    <td><span className={`badge status-${l.status}`}>{statusLabels[l.status] || l.status}</span></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{
                          width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                          background:`${wf.color}15`,flexShrink:0
                        }}>
                          <WfIcon size={14} style={{color: wf.color}} />
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:wf.color,lineHeight:1.3}}>{wf.label}</div>
                          {wf.person && wf.person !== '-' && (
                            <div style={{fontSize:11,color:'var(--color-text-muted)'}}>{wf.person}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{l.creator?.full_name}</td>
                    <td>{l.created_at ? new Date(l.created_at).toLocaleDateString('id-ID') : '-'}</td>
                    <td>
                      <div className="action-btns">
                        {(l.status === 'draft' || l.status === 'revision') && categoryCode ? (
                          <button className="btn btn-warning btn-sm" onClick={() => navigate(`/surat/${categoryCode}/edit/${l.id}`)}><Edit size={14}/> Edit</button>
                        ) : null}
                        {isMyTurn && (
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/letters/${l.id}`)}>
                            <WfIcon size={14}/> Proses
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/letters/${l.id}`)}><Eye size={14}/> Detail</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {letters.length === 0 && <tr><td colSpan={8} className="empty-state"><p>Tidak ada surat</p></td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">{letters.length} dari {total}</div>
            <div className="pagination-btns">
              <button disabled={page<=1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
