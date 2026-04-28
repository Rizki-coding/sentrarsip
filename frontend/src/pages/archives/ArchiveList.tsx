import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Archive, Classification, LetterType } from '../../types';
import { Plus, Search, Eye, Edit, Trash2, X, Upload } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ArchiveList() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);
  const [docLocations, setDocLocations] = useState<any[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Archive | null>(null);

  // Fetch PDF as blob when preview is opened
  useEffect(() => {
    if (preview) {
      let cancelled = false;
      api.get(`/archives/${preview}/preview`, { responseType: 'blob' })
        .then(res => {
          if (!cancelled) {
            const url = URL.createObjectURL(res.data);
            setPreviewUrl(url);
          }
        })
        .catch(() => {
          if (!cancelled) toast.error('Gagal memuat dokumen');
        });
      return () => { cancelled = true; };
    } else {
      setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    }
  }, [preview]);

  useEffect(() => { fetchArchives(); }, [page, search, filterStatus]);
  useEffect(() => {
    api.get('/classifications/flat').then(r => setClassifications(r.data || []));
    api.get('/letter-types').then(r => setLetterTypes(r.data || []));
    api.get('/document-locations').then(r => setDocLocations(r.data || []));
  }, []);

  const fetchArchives = async () => {
    const res = await api.get('/archives', {
      params: { page, limit: 10, search: search || undefined, status: filterStatus || undefined },
    });
    setArchives(res.data.data || []);
    setTotal(res.data.total);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await api.post('/archives', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Arsip berhasil disimpan');
      setShowForm(false);
      fetchArchives();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus arsip ini?')) return;
    await api.delete(`/archives/${id}`);
    toast.success('Arsip dihapus');
    fetchArchives();
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { aktif: 'Aktif', inaktif: 'Inaktif', musnah: 'Musnah' };
    return map[s] || s;
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <Toaster position="top-right" />
      <div className="page-header">
        <div><h1>Arsip Dokumen</h1><p>Kelola arsip surat masuk dan keluar</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={16}/> Input Arsip</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search-box"><Search /><input placeholder="Cari perihal, nomor agenda..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="inaktif">Inaktif</option>
            <option value="musnah">Musnah</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead><tr><th>No. Agenda</th><th>No. Dokumen</th><th>Perihal</th><th>Klasifikasi</th><th>Jenis</th><th>Lokasi</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {archives.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:600}}>{a.agenda_number}</td>
                  <td>{a.document_number || '-'}</td>
                  <td>{a.subject}</td>
                  <td><span className="badge badge-default">{a.classification?.code || '-'}</span></td>
                  <td>{a.letter_type?.name}</td>
                  <td>{a.document_location?.name || '-'}</td>
                  <td><span className={`badge status-${a.status}`}>{statusLabel(a.status)}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetailItem(a)} title="Lihat Detail">Detail</button>
                      {a.file_path && <button className="btn btn-ghost btn-sm" onClick={() => setPreview(a.id)} title="Preview PDF"><Eye size={14}/></button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {archives.length === 0 && <tr><td colSpan={8} className="empty-state"><p>Tidak ada data arsip</p></td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">{archives.length} dari {total}</div>
            <div className="pagination-btns">
              <button disabled={page<=1} onClick={() => setPage(p=>p-1)}>Prev</button>
              <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => { setPreview(null); setPreviewUrl(null); }}>
          <div className="modal modal-xl" onClick={e => e.stopPropagation()} style={{height:'90vh'}}>
            <div className="modal-header">
              <h2>Preview Dokumen</h2>
              <button className="btn btn-ghost" onClick={() => { setPreview(null); setPreviewUrl(null); }}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{padding:0,flex:1,height:'calc(90vh - 70px)'}}>
              {previewUrl ? (
                <iframe src={previewUrl} style={{width:'100%',height:'100%',border:'none'}} />
              ) : (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--color-text-muted)'}}>Memuat dokumen...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Arsip</h2>
              <button className="btn btn-ghost" onClick={() => setDetailItem(null)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label className="text-muted" style={{fontSize:12}}>No. Agenda</label><div style={{fontWeight:600}}>{detailItem.agenda_number}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>No. Dokumen</label><div style={{fontWeight:600}}>{detailItem.document_number || '-'}</div></div>
                <div style={{gridColumn:'1 / -1'}}><label className="text-muted" style={{fontSize:12}}>Perihal</label><div style={{fontWeight:600}}>{detailItem.subject}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Klasifikasi</label><div>{detailItem.classification?.name} ({detailItem.classification?.code})</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Jenis Surat</label><div>{detailItem.letter_type?.name}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Lokasi Arsip</label><div>{detailItem.document_location?.name || '-'}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Organisasi Pencipta</label><div>{detailItem.organization?.name || '-'}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Tanggal Dibuat</label><div>{new Date(detailItem.created_at).toLocaleDateString('id-ID')}</div></div>
                <div><label className="text-muted" style={{fontSize:12}}>Status Saat Ini</label><div>{statusLabel(detailItem.status)}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setDetailItem(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Upload size={20}/> Input Arsip Baru</h2>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Nomor Dokumen/Surat *</label><input className="form-control" name="document_number" required /></div>
                  <div className="form-group"><label>Nomor Agenda *</label><input className="form-control" name="agenda_number" required /></div>
                </div>
                <div className="form-group"><label>Asal Surat / Tujuan</label><input className="form-control" name="origin" /></div>
                <div className="form-group"><label>Perihal *</label><input className="form-control" name="subject" required /></div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>Klasifikasi *</label>
                    <select className="form-control" name="classification_id" required>
                      <option value="">Pilih...</option>
                      {classifications.map(c => <option key={c.id} value={c.id}>[{c.code}] {c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jenis Surat *</label>
                    <select className="form-control" name="letter_type_id" required>
                      <option value="">Pilih...</option>
                      {letterTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group"><label>Tgl Surat</label><input className="form-control" type="date" name="letter_date" /></div>
                  <div className="form-group"><label>Tgl Diterima</label><input className="form-control" type="date" name="received_date" /></div>
                  <div className="form-group">
                    <label>Lokasi Dokumen Fisik *</label>
                    <select className="form-control" name="document_location_id" required>
                      <option value="">Pilih Lokasi...</option>
                      {docLocations.map(dl => <option key={dl.id} value={dl.id}>{dl.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Upload Dokumen/File Arsip (PDF)</label>
                  <input className="form-control" type="file" name="file" accept=".pdf" />
                </div>
                <div className="form-group"><label>Keterangan</label><textarea className="form-control" name="description" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Arsip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
