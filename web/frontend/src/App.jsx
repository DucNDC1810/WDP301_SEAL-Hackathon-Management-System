import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/homepage/HomePage';
import LoginPage from './pages/login/LoginPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';
import ContestFormPage from './pages/admin/contest/ContestFormPage';
import TopicManagerPage from './pages/admin/topic/TopicManagerPage';
import TeamDashboardPage from './pages/admin/team/TeamDashboardPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen pages — no navbar/footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />

        {/* Main layout with navbar + footer */}
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin/contest/create" element={<ContestFormPage />} />
                <Route path="/admin/contests/:contestId/topics" element={<TopicManagerPage />} />
                <Route path="/admin/contests/:contestId/dashboard" element={<TeamDashboardPage />} />
              </Routes>
              <Footer />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
