import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminRoute, GuestRoute } from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/homepage/HomePage';
import LoginPage from './pages/login/LoginPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';
import AdminDashboard from './pages/admin/dashboard/AdminDashboard';
import ContestFormPage from './pages/admin/contest/ContestFormPage';
import ContestListPage from './pages/admin/contest/ContestListPage';
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
import TeamVerifyPage from './pages/team-verify/TeamVerifyPage';

import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Auth pages */}
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/team-verify" element={<TeamVerifyPage />} />

          {/* Admin layout — sidebar persists across all /admin/* pages */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="contest/create" element={<ContestFormPage />} />
            <Route path="contests" element={<ContestListPage />} />
            <Route path="contests/create" element={<ContestFormPage />} />
            <Route path="contests/:contestId/topics" element={<TopicManagerPage />} />
            <Route path="contests/:contestId/dashboard" element={<TeamDashboardPage />} />
            <Route path="team" element={<TeamRegistrationPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="results" element={<ResultsPage />} />
          </Route>

          {/* Public layout with navbar + footer */}
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/mentor/contests/:contestId/rounds/:roundId" element={<MentorDashboardPage />} />
                  <Route path="/mentor/score/:scoreId" element={<ScoreFormPage />} />
                  <Route path="/leaderboard/:contestId/:roundId" element={<LeaderboardPage />} />
                  <Route path="/history" element={<ContestHistoryPage />} />
                  <Route path="/appeals/:contestId" element={<AppealsPage />} />
                </Routes>
                <Footer />
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
