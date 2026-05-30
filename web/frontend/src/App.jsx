import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/homepage/HomePage';
import LoginPage from './pages/login/LoginPage';
import OAuthCallback from './pages/oauth-callback/OAuthCallback';

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
