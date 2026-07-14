import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { TrialProvider, useTrial } from './context/TrialContext';
import LandingPage from './pages/LandingPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';
import InsightsPage from './pages/InsightsPage';
import TrialDetailPage from './pages/TrialDetailPage';
import NotFoundPage from './pages/NotFoundPage';

// Simple Heart/Pulse SVG icon
const PulseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const Navigation = () => {
  const location = useLocation();
  const { bookmarks } = useTrial();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" id="nav-home-logo">
        <PulseIcon />
        <span>TrialBridge</span>
      </Link>
      <div className="navbar-links">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          id="nav-link-search"
        >
          Find Trials
        </Link>
        <Link 
          to="/about" 
          className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          id="nav-link-about"
        >
          About
        </Link>
        <Link 
          to="/insights" 
          className={`nav-link ${location.pathname === '/insights' ? 'active' : ''}`}
          id="nav-link-insights"
        >
          Insights
        </Link>
        <Link 
          to="/results?filter=bookmarks" 
          className={`nav-link bookmark-badge-container ${location.pathname === '/results' && new URLSearchParams(location.search).get('filter') === 'bookmarks' ? 'active' : ''}`}
          id="nav-link-bookmarks"
        >
          Saved
          {bookmarks.length > 0 && (
            <span className="bookmark-count">{bookmarks.length}</span>
          )}
        </Link>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-logo">
            Trial<span>Bridge</span>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
            Bridging the gap between patients and medical innovation.
          </p>
        </div>
        <div className="footer-links">
          <a href="/about" className="footer-link">About Project</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
          <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" className="footer-link">ClinicalTrials.gov API Credit</a>
        </div>
      </div>
      <div style={{ maxWidth: '1000px', margin: '1.5rem auto 0', padding: '0', fontSize: '0.75rem', opacity: 0.5, textAlign: 'center', borderTop: '1px solid #2D3748', paddingTop: '1.5rem' }}>
        Disclaimer: TrialBridge is a demonstration platform for clinical trial matching. It does not provide medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider.
      </div>
    </footer>
  );
};

const AppContent = () => {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/trial/:nctId" element={<TrialDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <TrialProvider>
      <Router>
        <AppContent />
      </Router>
    </TrialProvider>
  );
}

export default App;
