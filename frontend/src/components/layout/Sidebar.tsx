import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { LetterCategory } from '../../types';
import {
  LayoutDashboard, Users, Building2, Briefcase, FolderTree,
  FileText, Archive, MailOpen, Send, CheckSquare, GitBranch,
  MapPin, FileStack, UsersRound, Bell, User as UserIcon, History, FolderOpen, Inbox
} from 'lucide-react';

// Map sidebar sections to permission menu IDs
const SECTION_PERMISSION_MAP: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Manajemen': 'manajemen',
  'Master Data': 'master_data',
  'Penyimpanan': 'arsip',
};

export default function Sidebar() {
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const [categories, setCategories] = useState<LetterCategory[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.get('/letter-categories').then(r => setCategories(r.data || []));
      api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count || 0));
    }
  }, [user]);

  const navItems = [
    { section: 'Dashboard', items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ]},
    { section: 'Personal', items: [
      { path: '/profile', icon: UserIcon, label: 'Profil Saya' },
      { path: '/notifications', icon: Bell, label: 'Notifikasi', badge: unreadCount },
    ]},
    { section: 'Persuratan', items: [
      ...categories.map(c => ({
        path: `/surat/${c.code}`, icon: MailOpen, label: c.name,
        permId: `surat_${c.code}`,
      }))
    ]},
    { section: 'Penyimpanan', items: [
      { path: '/archives', icon: Archive, label: 'Arsip Dokumen' },
    ]},
    { section: 'Penerimaan', items: [
      { path: '/penerimaan-surat', icon: Inbox, label: 'Penerimaan Surat' },
    ]},
    { section: 'Master Data', items: [
      { path: '/letter-categories', icon: FolderOpen, label: 'Kategori Surat' },
      { path: '/letter-types', icon: FileText, label: 'Jenis Surat' },
      { path: '/templates', icon: FileStack, label: 'Template Surat' },
      { path: '/classifications', icon: FolderTree, label: 'Klasifikasi' },
      { path: '/document-locations', icon: MapPin, label: 'Lokasi Dokumen' },
    ]},
    { section: 'Manajemen', items: [
      { path: '/users', icon: Users, label: 'User Management' },
      { path: '/roles', icon: UsersRound, label: 'Role Pengguna' },
      { path: '/role-access', icon: Briefcase, label: 'Akses Role' },
      { path: '/organizations', icon: Building2, label: 'Organisasi' },
      { path: '/positions', icon: Briefcase, label: 'Jabatan' },
      { path: '/groups', icon: UsersRound, label: 'Grup' },
    ]},
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">SA</div>
        <div>
          <h1>Sentrarsip</h1>
          <span>v1.0</span>
        </div>
      </div>

      <div className="sidebar-scroll" style={{overflowY: 'auto', height: 'calc(100vh - 70px)', paddingBottom: 20}}>
        {navItems.map((section) => {
          // Permission-based filtering: check section-level permission
          const permKey = SECTION_PERMISSION_MAP[section.section];
          if (permKey && !hasPermission(permKey, 'view')) return null;

          // Filter individual surat items by their specific permission
          const visibleItems = section.section === 'Persuratan'
            ? section.items.filter((item: any) => !item.permId || hasPermission(item.permId, 'view'))
            : section.items;

          if (visibleItems.length === 0) return null;

          return (
            <div className="sidebar-section" key={section.section}>
              <div className="sidebar-section-title">{section.section}</div>
              <nav className="sidebar-nav">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path + '/') && item.path !== '/');
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} />
                      <span style={{flex:1}}>{item.label}</span>
                      {'badge' in item && (item as any).badge !== undefined && (item as any).badge > 0 && (
                        <span className="badge badge-error" style={{padding:'2px 6px', fontSize:10}}>{(item as any).badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
