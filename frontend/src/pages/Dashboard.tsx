import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Archive, FileText, Mail, Users, CheckSquare, GitBranch, TrendingUp } from 'lucide-react';
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  pending_review: '#f59e0b',
  revision: '#ef4444',
  pending_sign: '#8b5cf6',
  signed: '#06b6d4',
  published: '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Menunggu Review',
  revision: 'Revisi',
  pending_sign: 'Menunggu TTD',
  signed: 'Ditandatangani',
  published: 'Diterbitkan',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

const ORG_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0, archives: 0, letters: 0,
    pendingReview: 0, pendingSign: 0, published: 0,
  });
  const [chartData, setChartData] = useState<{
    byStatus: { name: string; value: number; color: string }[];
    byMonth: { month: string; count: number }[];
    byOrg: { name: string; count: number }[];
  }>({ byStatus: [], byMonth: [], byOrg: [] });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, archivesRes, lettersRes, inboxRes, signedRes, publishedRes, dashRes] = await Promise.all([
          api.get('/users?limit=1'),
          api.get('/archives?limit=1'),
          api.get('/letters?limit=1'),
          api.get('/letters?inbox=true&limit=1'),
          api.get('/letters?status=signed&limit=1'),
          api.get('/letters?status=published&limit=1'),
          api.get('/dashboard/stats'),
        ]);

        setStats({
          users: usersRes.data.total || 0,
          archives: archivesRes.data.total || 0,
          letters: lettersRes.data.total || 0,
          pendingReview: inboxRes.data.total || 0,
          pendingSign: signedRes.data.total || 0,
          published: publishedRes.data.total || 0,
        });

        // Process chart data
        const rawStatus = dashRes.data.by_status || [];
        const byStatus = rawStatus.map((s: any) => ({
          name: STATUS_LABELS[s.status] || s.status,
          value: s.count,
          color: STATUS_COLORS[s.status] || '#94a3b8',
        }));

        const rawMonth = dashRes.data.by_month || [];
        const byMonth = rawMonth.map((m: any) => {
          const [, mm] = m.month.split('-');
          return { month: MONTH_NAMES[parseInt(mm) - 1] || m.month, count: m.count };
        });

        const rawOrg = dashRes.data.by_organization || [];
        const byOrg = rawOrg.map((o: any) => ({
          name: o.org_name || 'Lainnya',
          count: o.count,
        }));

        setChartData({ byStatus, byMonth, byOrg });
      } catch { /* ignore */ }
    };
    fetchAll();
  }, []);

  const statCards = [
    { icon: Users, label: 'Total Pengguna', value: stats.users, cls: 'primary' },
    { icon: Mail, label: 'Total Surat', value: stats.letters, cls: 'info' },
    { icon: Archive, label: 'Total Arsip', value: stats.archives, cls: 'success' },
    { icon: CheckSquare, label: 'Perlu Tindakan', value: stats.pendingReview, cls: 'warning' },
    { icon: GitBranch, label: 'Menunggu TTD', value: stats.pendingSign, cls: 'accent' },
    { icon: FileText, label: 'Diterbitkan', value: stats.published, cls: 'success' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Selamat datang, <strong>{user?.full_name}</strong> 👋</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${s.cls}`}><Icon size={24} /></div>
              <div className="stat-info">
                <h3>{s.value}</h3>
                <p>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        {/* Pie Chart - Status */}
        <div className="card">
          <div className="card-header"><h3>Distribusi Status Surat</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {chartData.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: 11 }}
                  >
                    {chartData.byStatus.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 13 }}
                    formatter={(value: number) => [`${value} surat`, 'Jumlah']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Belum ada data</p></div>
            )}
          </div>
        </div>

        {/* Area Chart - Monthly Trend */}
        <div className="card">
          <div className="card-header">
            <h3><TrendingUp size={18} style={{display:'inline',verticalAlign:'middle',marginRight:8}}/>Tren Surat 6 Bulan Terakhir</h3>
          </div>
          <div className="card-body" style={{ height: 320 }}>
            {chartData.byMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.byMonth}>
                  <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 13 }}
                    formatter={(value: number) => [`${value} surat`, 'Jumlah']}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradientArea)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>Belum ada data</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Bar Chart - Per Organization (full width) */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>Surat per Organisasi</h3></div>
        <div className="card-body" style={{ height: 360 }}>
          {chartData.byOrg.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.byOrg} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" width={160} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 13 }}
                  formatter={(value: number) => [`${value} surat`, 'Jumlah']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                  {chartData.byOrg.map((_entry, idx) => (
                    <Cell key={idx} fill={ORG_COLORS[idx % ORG_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>Belum ada data</p></div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>Informasi Sistem</h3></div>
        <div className="card-body">
          <table>
            <tbody>
              <tr><td style={{fontWeight:600,width:200}}>Nama Sistem</td><td>Sentrarsip v1.0</td></tr>
              <tr><td style={{fontWeight:600}}>Backend</td><td>Go (Gin + GORM) — Port 8080</td></tr>
              <tr><td style={{fontWeight:600}}>Frontend</td><td>React + TypeScript + Vite</td></tr>
              <tr><td style={{fontWeight:600}}>Database</td><td>MySQL / MariaDB (Laragon)</td></tr>
              <tr><td style={{fontWeight:600}}>Role Anda</td><td><span className="badge badge-primary" style={{textTransform:'uppercase'}}>{user?.role}</span></td></tr>
              <tr><td style={{fontWeight:600}}>Organisasi</td><td>{user?.organization?.name || '-'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
