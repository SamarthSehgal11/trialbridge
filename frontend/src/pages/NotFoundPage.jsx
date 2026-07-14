import React from 'react';
import { Link } from 'react-router-dom';

const ShieldAlertIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const NotFoundPage = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '70vh', 
      textAlign: 'center', 
      padding: '2rem',
      backgroundColor: 'var(--bg-color)' 
    }}>
      <div className="empty-state" style={{ padding: '3rem 2rem' }}>
        <ShieldAlertIcon />
        <h1 style={{ fontSize: '2.5rem', marginTop: '1.5rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Page Not Found
        </h1>
        <p className="empty-state-desc" style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
          The link you followed may be broken or the page has been moved. Let's get you back to matching clinical trials.
        </p>
        <Link 
          to="/" 
          className="search-button" 
          style={{ display: 'inline-flex', margin: '0 auto', textDecoration: 'none' }}
          id="notfound-home-redirect"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
