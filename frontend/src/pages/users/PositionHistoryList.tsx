import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { UserPosition } from '../../types';
import { History } from 'lucide-react';

export default function PositionHistoryList() {
  const [history, setHistory] = useState<UserPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/position-history')
      .then(r => setHistory(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><History size={24} style={{display:'inline',verticalAlign:'middle',marginRight:10}}/> Riwayat Jabatan</h1>
          <p>Melihat riwayat penugasan dan masa jabatan seluruh pegawai</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body" style={{textAlign:'center',padding:40}}>Loading...</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nama Pegawai</th>
                  <th>Jabatan</th>
                  <th>Status</th>
                  <th>Mulai Jabatan</th>
                  <th>Akhir Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{fontWeight:600}}>{h.user?.full_name} <span style={{fontSize:11,opacity:0.6}}><br/>{h.user?.nip}</span></td>
                    <td>{h.position?.name}</td>
                    <td><span className={`badge ${h.is_primary ? 'badge-primary' : 'badge-default'}`}>{h.is_primary ? 'Utama' : 'Tambahan / Lama'}</span></td>
                    <td>{new Date(h.start_date).toLocaleDateString('id-ID')}</td>
                    <td>{h.end_date ? new Date(h.end_date).toLocaleDateString('id-ID') : 'Sekarang'}</td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={5} className="empty-state">Tidak ada riwayat</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
