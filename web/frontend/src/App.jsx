import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, GuestRoute, AuthRoute, MentorRoute, JudgeRoute, MentorScoringRoute } from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/homepage/HomePage';
import AuthPage from './pages/auth/AuthPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';

// Admin
import AdminDashboard from './pages/admin/dashboard/AdminDashboard';
import ContestFormPage from './pages/admin/contest/ContestFormPage';
import ContestListPage from './pages/admin/contest/ContestListPage';
import TopicManagerPage from './pages/admin/topic/TopicManagerPage';
import TeamDashboardPage from './pages/admin/team/TeamDashboardPage';
import TeamRegistrationPage from './pages/admin/team-registration/TeamRegistrationPage';
import AIAssistantPage from './pages/admin/ai-assistant/AIAssistantPage';
import ResultsPage from './pages/admin/results/ResultsPage';
import HackathonListPage from './pages/admin/hackathons/HackathonListPage';
import HackathonDetailPage from './pages/admin/hackathons/HackathonDetailPage';
import UserManagementPage from './pages/admin/users/UserManagementPage';

// Mentor
import MentorHomePage from './pages/mentor/MentorDashboard';
import MentorDashboardPage from './pages/mentor/MentorDashboardPage';
import MentorPortalPage from './pages/mentor/MentorPortalPage';
import MentorScoringPage from './pages/mentor/JudgeScoringPage';
import ScoreFormPage from './pages/mentor/ScoreFormPage';
import MentorChatPage from './pages/mentor/MentorChatPage';

// Judge
import JudgeHomePage from './pages/judge/JudgeDashboard';
import JudgeScoringPage from './pages/judge/JudgeScoringPage';
import JudgeAcceptInvitePage from './pages/judge/JudgeAcceptInvitePage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import ContestHistoryPage from './pages/history/ContestHistoryPage';
import AppealsPage from './pages/appeals/AppealsPage';

// Student
import StudentDashboardPage from './pages/student/dashboard/StudentDashboardPage';
import TeamChatPage from './pages/student/chat/TeamChatPage';
import ProfilePage from './pages/student/profile/ProfilePage';
import InvitationsPage from './pages/student/invitations/InvitationsPage';
import InvitationVerifyPage from './pages/invite-verify/InvitationVerifyPage';
import TeamVerifyPage from './pages/team-verify/TeamVerifyPage';
import VerifyEmailPage from './pages/verify-email/VerifyEmailPage';

import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00f0ff',
          colorBgContainer: '#111827',
          colorBgElevated: '#1a2332',
          borderRadius: 8,
          fontFamily: "'Inter', system-ui, sans-serif",
        },
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route path="/verify-invitation" element={<InvitationVerifyPage />} />
              <Route path="/team-verify" element={<TeamVerifyPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="dashboard"                     element={<AdminDashboard />} />
                <Route path="contest/create"                element={<ContestFormPage />} />
                <Route path="contests"                      element={<ContestListPage />} />
                <Route path="contests/create"               element={<ContestFormPage />} />
                <Route path="contests/:contestId/topics"    element={<TopicManagerPage />} />
                <Route path="contests/:contestId/dashboard" element={<TeamDashboardPage />} />
                <Route path="team"                          element={<TeamRegistrationPage />} />
                <Route path="ai-assistant"                  element={<AIAssistantPage />} />
                <Route path="results"                       element={<ResultsPage />} />
                <Route path="hackathons"                    element={<HackathonListPage />} />
                <Route path="hackathons/:id"                element={<HackathonDetailPage />} />
                <Route path="users"                         element={<UserManagementPage />} />
              </Route>

              {/* Mentor — coaching + scoring (không được chấm team mình mentor) */}
              <Route path="/mentor/dashboard"                             element={<MentorRoute><MentorHomePage /></MentorRoute>} />
              <Route path="/mentor/chat"                                  element={<MentorRoute><MentorChatPage /></MentorRoute>} />
              <Route path="/mentor/portal/:contestId/:roundId"            element={<MentorRoute><MentorPortalPage /></MentorRoute>} />
              <Route path="/mentor/scoring/:contestId/rounds/:roundId"    element={<MentorScoringRoute><MentorScoringPage /></MentorScoringRoute>} />
              <Route path="/mentor/contests/:contestId/rounds/:roundId"   element={<MentorRoute><MentorDashboardPage /></MentorRoute>} />
              <Route path="/mentor/score/:scoreId"                        element={<MentorRoute><ScoreFormPage /></MentorRoute>} />

              {/* Judge — chỉ chấm điểm sau khi vòng kết thúc */}
              <Route path="/judge/accept-invite"                           element={<JudgeAcceptInvitePage />} />
              <Route path="/judge/dashboard"                              element={<JudgeRoute><JudgeHomePage /></JudgeRoute>} />
              <Route path="/judge/scoring/:contestId/rounds/:roundId/pools/:poolId" element={<JudgeRoute><JudgeScoringPage /></JudgeRoute>} />

              {/* All public pages with Navbar/Footer */}
              <Route
                path="/*"
                element={
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Navbar />
                    <main style={{ flex: 1, paddingTop: '72px' }}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />

                        {/* Student (auth required) */}
                        <Route path="/dashboard"   element={<AuthRoute><StudentDashboardPage /></AuthRoute>} />
                        <Route path="/team"        element={<AuthRoute><StudentDashboardPage /></AuthRoute>} />
                        <Route path="/profile"     element={<AuthRoute><ProfilePage /></AuthRoute>} />
                        <Route path="/invitations" element={<AuthRoute><InvitationsPage /></AuthRoute>} />
                        <Route path="/chat/mentor" element={<AuthRoute><TeamChatPage /></AuthRoute>} />

                        {/* Public */}
                        <Route path="/leaderboard/:contestId/:roundId" element={<LeaderboardPage />} />
                        <Route path="/history"                         element={<ContestHistoryPage />} />
                        <Route path="/appeals/:contestId"              element={<AppealsPage />} />
                      </Routes>
                    </main>
                    <Footer />
                  </div>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export default App;
