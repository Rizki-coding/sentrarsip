import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardShell from './components/layout/DashboardShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import UserList from './pages/users/UserList';
import RoleList from './pages/users/RoleList';
import RoleAccessList from './pages/users/RoleAccessList';
import GroupList from './pages/users/GroupList';
import PositionHistoryList from './pages/users/PositionHistoryList';
import ProfilePage from './pages/users/ProfilePage';

import OrgList from './pages/organizations/OrgList';
import PositionList from './pages/organizations/PositionList';

import ClassificationList from './pages/master/ClassificationList';
import TemplateList from './pages/master/TemplateList';
import MasterDataPage from './pages/master/MasterDataPage';
import LetterCategoryList from './pages/master/LetterCategoryList';
import LetterTypeList from './pages/master/LetterTypeList';

import ArchiveList from './pages/archives/ArchiveList';
import LetterList from './pages/letters/LetterList';
import LetterCreate from './pages/letters/LetterCreate';
import LetterEdit from './pages/letters/LetterEdit';
import LetterDetail from './pages/letters/LetterDetail';

import ReceivedLetters from './pages/workflow/ReceivedLetters';
import NotificationPage from './pages/notifications/NotificationPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<DashboardShell />}>
            <Route path="/" element={<Dashboard />} />
            
            {/* Personal */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationPage />} />

            {/* Management */}
            <Route path="/users" element={<UserList />} />
            <Route path="/roles" element={<RoleList />} />
            <Route path="/role-access" element={<RoleAccessList />} />
            <Route path="/organizations" element={<OrgList />} />
            <Route path="/positions" element={<PositionList />} />
            <Route path="/position-history" element={<PositionHistoryList />} />
            <Route path="/groups" element={<GroupList />} />
            
            {/* Master Data */}
            <Route path="/letter-categories" element={<LetterCategoryList />} />
            <Route path="/classifications" element={<ClassificationList />} />
            <Route path="/letter-types" element={<LetterTypeList />} />
            <Route path="/document-locations" element={<MasterDataPage type="document-locations" />} />
            <Route path="/templates" element={<TemplateList />} />

            {/* Letters & Archives */}
            <Route path="/surat/:categoryCode" element={<LetterList />} />
            <Route path="/surat/:categoryCode/create" element={<LetterCreate />} />
            <Route path="/surat/:categoryCode/edit/:id" element={<LetterEdit />} />
            <Route path="/letters/:id" element={<LetterDetail />} />
            <Route path="/archives" element={<ArchiveList />} />

            {/* Workflow */}
            <Route path="/penerimaan-surat" element={<ReceivedLetters />} />
            
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
