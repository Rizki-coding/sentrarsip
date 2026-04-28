import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Letter, LetterCategory } from '../../types';
import { Eye, Inbox, FileCheck, FolderOpen } from 'lucide-react';

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_review: 'Menunggu Review', revision: 'Revisi',
  pending_sign: 'Menunggu TTD', signed: 'Ditandatangani', published: 'Diterbitkan',
};

// Group letters by category
function groupLettersByCategory(letters: Letter[]) {
  const groups: Record<string, Letter[]> = {};
  for (const l of letters) {
    const key = l.letter_type?.letter_category?.name || 'Kategori Lainnya';
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }
  return groups;
}

export default function ReceivedLetters() {
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<LetterCategory[]>([]);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { 
    api.get('/letter-categories').then(r => setCategories(r.data || []));
    fetchReceived(); 
  }, []);

  const fetchReceived = async () => {
    setLoading(true);
    try {
      const res = await api.get('/letters/received', { params: { limit: 100 } });
      setLetters(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {
      setLetters([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = letters.filter(l => {
    const catId = l.letter_type?.letter_category_id?.toString() || '';
    const matchCat = !filterCat || catId === filterCat;
    const matchSearch = !search || l.subject.toLowerCase().includes(search.toLowerCase()) || l.letter_number.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = groupLettersByCategory(filtered);

  // Category summary counts
  const catCounts: Record<string, number> = {};
  for (const l of letters) {
    const cid = l.letter_type?.letter_category_id?.toString();
    if (cid) catCounts[cid] = (catCounts[cid] || 0) + 1;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Penerimaan Surat</h1>
          <p>Daftar surat yang diterima oleh Anda sebagai penerima — Total: <strong>{total}</strong> surat</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:24}}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="card"
            style={{
              cursor:'pointer',
              borderLeft: filterCat === cat.id.toString() ? '4px solid var(--color-primary)' : '4px solid transparent',
              background: filterCat === cat.id.toString() ? 'rgba(99,102,241,0.05)' : undefined,
              transition:'all 0.2s'
            }}
            onClick={() => setFilterCat(filterCat === cat.id.toString() ? '' : cat.id.toString())}
          >
            <div className="card-body" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                  <FolderOpen size={15}/> {cat.name}
                </div>
                <div style={{fontSize:26,fontWeight:700,color:'var(--color-primary)'}}>
                  {catCounts[cat.id.toString()] || 0}
                </div>
              </div>
              {filterCat === cat.id.toString() && (
                <span style={{fontSize:11,color:'var(--color-primary)',fontWeight:600}}>Aktif ✓</span>
              )}
            </div>
          </div>
        ))}
        <div className="card">
          <div className="card-body" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:12,color:'var(--color-text-muted)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                <FileCheck size={15}/> Total Diterima
              </div>
              <div style={{fontSize:26,fontWeight:700,color:'var(--color-success)'}}>
                {total}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & filter */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-body" style={{padding:'12px 20px',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <input
            className="form-control"
            style={{maxWidth:320}}
            placeholder="Cari perihal atau nomor surat..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-control" style={{maxWidth:200}} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.name}</option>
            ))}
          </select>
          {(filterCat || search) && (
            <button className="btn btn-outline btn-sm" onClick={() => { setFilterCat(''); setSearch(''); }}>
              Reset Filter
            </button>
          )}
          <span style={{marginLeft:'auto',fontSize:13,color:'var(--color-text-muted)'}}>
            Menampilkan {filtered.length} dari {total} surat
          </span>
        </div>
      </div>

      {loading && (
        <div className="loading-spinner"><div className="spinner"/></div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <div className="card-body" style={{textAlign:'center',padding:60}}>
            <Inbox size={48} style={{color:'var(--color-text-muted)',marginBottom:16}} />
            <h3 style={{color:'var(--color-text-muted)'}}>Tidak ada surat diterima</h3>
            <p style={{color:'var(--color-text-muted)'}}>
              {search || filterCat ? 'Tidak ada surat yang sesuai filter.' : 'Belum ada surat yang ditujukan kepada Anda.'}
            </p>
          </div>
        </div>
      )}

      {/* Grouped by letter type */}
      {!loading && Object.keys(grouped).length > 0 && Object.entries(grouped).map(([typeName, typeLetters]) => (
        <div key={typeName} className="card" style={{marginBottom:20}}>
          <div className="card-header">
            <h3 style={{display:'flex',alignItems:'center',gap:8}}>
              <FolderOpen size={17}/> {typeName}
              <span className="badge badge-primary" style={{fontSize:12}}>{typeLetters.length}</span>
            </h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nomor Surat</th>
                  <th>Perihal</th>
                  <th>Jenis</th>
                  <th>Dari</th>
                  <th>Tanggal</th>
                  <th>Penerima Lain</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {typeLetters.map(l => {
                  const otherRecipients = (l.recipients || []).filter(r => r.recipient_name !== '');
                  return (
                    <tr key={l.id}>
                      <td style={{fontWeight:600,fontFamily:'monospace',fontSize:12}}>
                        {l.letter_number || '-'}
                      </td>
                      <td>
                        <div style={{fontWeight:500}}>{l.subject}</div>
                      </td>
                      <td style={{fontSize:13}}>{l.letter_type?.name}</td>
                      <td style={{fontSize:13}}>
                        <div style={{fontWeight:500}}>{l.creator?.full_name}</div>
                        <div style={{fontSize:11,color:'var(--color-text-muted)'}}>{l.creator?.position?.name}</div>
                      </td>
                      <td style={{fontSize:12,whiteSpace:'nowrap'}}>
                        {l.letter_date ? new Date(l.letter_date).toLocaleDateString('id-ID', {day:'2-digit',month:'long',year:'numeric'}) : '-'}
                      </td>
                      <td style={{fontSize:12,color:'var(--color-text-muted)'}}>
                        {otherRecipients.length > 1
                          ? `${otherRecipients[0].recipient_name} +${otherRecipients.length - 1} lainnya`
                          : otherRecipients[0]?.recipient_name || '-'
                        }
                      </td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/letters/${l.id}`)}>
                          <Eye size={13}/> Buka
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
