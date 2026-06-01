import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/homepage/HomePage';
import LoginPage from './pages/login/LoginPage';
import SignupPage from './pages/signup/SignupPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';
import ContestantDashboard from './pages/contestant/ContestantDashboard';
import ContestantHome from './pages/contestant/ContestantHome';
import VerifyEmail from './pages/verify-email/VerifyEmail';

import AdminDashboard from './pages/admin/AdminDashboard';
import MentorDashboard from './pages/mentor/MentorDashboard';
import Leaderboard from './pages/leaderboard/Leaderboard';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Full-screen pages — no navbar/footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        <Route path="/contestant" element={<ContestantDashboard />} />
        <Route path="/contestant-home" element={<ContestantHome />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/mentor" element={<MentorDashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />

        {/* Main layout with navbar + footer */}
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
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
