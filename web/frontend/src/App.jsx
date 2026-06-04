import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, GuestRoute, AuthRoute } from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/homepage/HomePage';
import AuthPage from './pages/auth/AuthPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';
import AdminDashboard from './pages/admin/dashboard/AdminDashboard';
import ContestFormPage from './pages/admin/contest/ContestFormPage';
import TopicManagerPage from './pages/admin/topic/TopicManagerPage';
import TeamDashboardPage from './pages/admin/team/TeamDashboardPage';
import TeamRegistrationPage from './pages/admin/team-registration/TeamRegistrationPage';
import AIAssistantPage from './pages/admin/ai-assistant/AIAssistantPage';
import AIInsightsPage from './pages/admin/ai-insights/AIInsightsPage';
import ResultsPage from './pages/admin/results/ResultsPage';
import MentorDashboardPage from './pages/mentor/MentorDashboardPage';
import ScoreFormPage from './pages/mentor/ScoreFormPage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import ContestHistoryPage from './pages/history/ContestHistoryPage';
import AppealsPage from './pages/appeals/AppealsPage';
import StudentDashboardPage from './pages/student/dashboard/StudentDashboardPage';
import ProfilePage from './pages/student/profile/ProfilePage';
import TeamPage from './pages/student/team/TeamPage';
import InvitationsPage from './pages/student/invitations/InvitationsPage';
import InvitationVerifyPage from './pages/invite-verify/InvitationVerifyPage';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/verify-invitation" element={<InvitationVerifyPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="dashboard"                     element={<AdminDashboard />} />
            <Route path="contest/create"                element={<ContestFormPage />} />
            <Route path="contests/:contestId/topics"    element={<TopicManagerPage />} />
            <Route path="contests/:contestId/dashboard" element={<TeamDashboardPage />} />
            <Route path="team"                          element={<TeamRegistrationPage />} />
            <Route path="ai-assistant"                  element={<AIAssistantPage />} />
            <Route path="ai-insights"                   element={<AIInsightsPage />} />
            <Route path="results"                       element={<ResultsPage />} />
          </Route>

          {/* Public + Student pages with Navbar/Footer */}
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/dashboard"   element={<AuthRoute><StudentDashboardPage /></AuthRoute>} />
                  <Route path="/profile"     element={<AuthRoute><ProfilePage /></AuthRoute>} />
                  <Route path="/team"        element={<AuthRoute><TeamPage /></AuthRoute>} />
                  <Route path="/invitations" element={<AuthRoute><InvitationsPage /></AuthRoute>} />
                  <Route path="/mentor/contests/:contestId/rounds/:roundId" element={<MentorDashboardPage />} />
                  <Route path="/mentor/score/:scoreId"                      element={<ScoreFormPage />} />
                  <Route path="/leaderboard/:contestId/:roundId"            element={<LeaderboardPage />} />
                  <Route path="/history"                                    element={<ContestHistoryPage />} />
                  <Route path="/appeals/:contestId"                         element={<AppealsPage />} />
                </Routes>
                <Footer />
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
