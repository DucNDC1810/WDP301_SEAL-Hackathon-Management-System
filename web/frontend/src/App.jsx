import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, GuestRoute, AuthRoute, MentorRoute, JudgeRoute, MentorScoringRoute } from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/homepage/HomePage';
import LoginPage from './pages/login/LoginPage';
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
import HackathonFeaturePage from './pages/admin/hackathons/HackathonFeaturePage';
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
import LegacyLeaderboardPage from './pages/leaderboard/LeaderboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import WildCardPage from './pages/WildCardPage';
import FinalistConfirmPage from './pages/FinalistConfirmPage';
import RoundActivatePage from './pages/RoundActivatePage';
import SubmissionPage from './pages/SubmissionPage';
import ContestHistoryPage from './pages/history/ContestHistoryPage';
import CalibrationPage from './pages/CalibrationPage';
import AppealsPage from './pages/appeals/AppealsPage';

// Student
import TeamChatPage from './pages/student/chat/TeamChatPage';
import ProfilePage from './pages/student/profile/ProfilePage';
import InvitationVerifyPage from './pages/invite-verify/InvitationVerifyPage';
import { CompleteProfilePage } from './pages/complete-profile/CompleteProfilePage';
import TeamVerifyPage from './pages/team-verify/TeamVerifyPage';
import VerifyEmailPage from './pages/verify-email/VerifyEmailPage';
import { StudentLayout }       from './layouts/StudentLayout';
import { StudentOverviewPage } from './pages/student/overview/StudentOverviewPage';
import { StudentTeamPage }     from './pages/student/team/StudentTeamPage';
import { StudentConnectPage }  from './pages/student/connect/StudentConnectPage';
import { StudentSubmitPage }   from './pages/student/submit/StudentSubmitPage';

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
          fontFamily: "'Be Vietnam Pro', 'Inter', system-ui, sans-serif",
        },
      }}
    >
      <AntApp>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/verify-invitation" element={<InvitationVerifyPage />} />
              <Route path="/team-verify" element={<TeamVerifyPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Screens without Navbar/Footer */}
              <Route path="/wildcard/:round_id" element={<WildCardPage />} />
              <Route path="/finalist/:round_id/confirm" element={<FinalistConfirmPage />} />
              <Route path="/round/:round_id/activate" element={<RoundActivatePage />} />
              <Route path="/submission/:round_id/:team_id" element={<SubmissionPage />} />
              <Route path="/calibration/:round_id" element={<CalibrationPage />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="dashboard"                     element={<AdminDashboard />} />
                <Route path="contest/create"                element={<ContestFormPage />} />
                <Route path="contests"                      element={<ContestListPage />} />
                <Route path="contests/create"               element={<ContestFormPage />} />
                <Route path="contests/:contestId/topics"    element={<TopicManagerPage />} />
                <Route path="contests/:contestId/dashboard" element={<TeamDashboardPage />} />
                <Route path="team"                          element={<TeamRegistrationPage />} />
                <Route path="team/:contestId"               element={<TeamRegistrationPage />} />
                <Route path="ai-assistant"                  element={<AIAssistantPage />} />
                <Route path="results"                       element={<ResultsPage />} />
                <Route path="hackathons"                    element={<HackathonListPage />} />
                <Route path="hackathons/:id"                element={<HackathonDetailPage />} />
                <Route path="submission-review"                element={<HackathonFeaturePage feature="submission-review" />} />
                <Route path="submission-review/:contestId"     element={<HackathonFeaturePage feature="submission-review" />} />
                <Route path="scoring-lock"                     element={<HackathonFeaturePage feature="scoring-lock" />} />
                <Route path="scoring-lock/:contestId"          element={<HackathonFeaturePage feature="scoring-lock" />} />
                <Route path="elimination"                      element={<HackathonFeaturePage feature="elimination" />} />
                <Route path="elimination/:contestId"           element={<HackathonFeaturePage feature="elimination" />} />
                <Route path="timeline"                         element={<HackathonFeaturePage feature="timeline" />} />
                <Route path="timeline/:contestId"              element={<HackathonFeaturePage feature="timeline" />} />
                <Route path="presentation"                     element={<HackathonFeaturePage feature="presentation" />} />
                <Route path="presentation/:contestId"          element={<HackathonFeaturePage feature="presentation" />} />
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

              {/* Student dashboard — sidebar layout, no Navbar/Footer */}
              <Route path="/dashboard" element={<AuthRoute><StudentLayout /></AuthRoute>}>
                <Route index            element={<StudentOverviewPage />} />
                <Route path="team"      element={<StudentTeamPage />} />
                <Route path="connect"   element={<StudentConnectPage />} />
                <Route path="submit"    element={<StudentSubmitPage />} />
                <Route path="profile"   element={<ProfilePage />} />
              </Route>

              {/* All public pages with Navbar/Footer */}
              <Route
                path="/*"
                element={
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Navbar />
                    <main style={{ flex: 1, paddingTop: '72px' }}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />

                        {/* Legacy redirects */}
                        <Route path="/team"        element={<Navigate to="/dashboard/team"    replace />} />
                        <Route path="/profile"     element={<Navigate to="/dashboard/profile" replace />} />
                        <Route path="/invitations" element={<Navigate to="/dashboard/team"    replace />} />
                        <Route path="/chat/mentor" element={<AuthRoute><TeamChatPage /></AuthRoute>} />

                        {/* Public */}
                        <Route path="/leaderboard/:contestId/:roundId" element={<LegacyLeaderboardPage />} />
                        <Route path="/leaderboard/:round_id"           element={<LeaderboardPage />} />
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
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
