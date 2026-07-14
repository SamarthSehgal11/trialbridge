import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTrial } from '../context/TrialContext';

// Icons
const StarIcon = ({ filled }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill={filled ? "var(--accent-color)" : "none"} 
    stroke={filled ? "var(--accent-color)" : "currentColor"} 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const parseEligibility = (criteriaText) => {
  if (!criteriaText) return { inclusion: [], exclusion: [] };

  let inclusionText = '';
  let exclusionText = '';

  const lowerText = criteriaText.toLowerCase();
  const exclusionKeywords = [
    'exclusion criteria:',
    'exclusion criteria',
    'exclusions:',
    'exclusions',
    'exclusionary criteria'
  ];

  let splitIdx = -1;
  for (const kw of exclusionKeywords) {
    const idx = lowerText.indexOf(kw);
    if (idx !== -1) {
      splitIdx = idx;
      break;
    }
  }

  if (splitIdx !== -1) {
    inclusionText = criteriaText.substring(0, splitIdx);
    const rest = criteriaText.substring(splitIdx);
    const lineBreak = rest.indexOf('\n');
    exclusionText = lineBreak !== -1 ? rest.substring(lineBreak) : rest;
  } else {
    inclusionText = criteriaText;
  }

  const parseBullets = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line) return false;
        const l = line.toLowerCase();
        if (l.startsWith('inclusion criteria') || l.startsWith('exclusion criteria') || l.startsWith('eligibility criteria')) return false;
        return true;
      })
      .map(line => line.replace(/^[\s*\-•+]+/, '').trim())
      .filter(line => line.length > 5);
  };

  return {
    inclusion: parseBullets(inclusionText),
    exclusion: parseBullets(exclusionText)
  };
};

const TrialDetailPage = () => {
  const { nctId } = useParams();
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark, updateBookmarkNotes } = useTrial();
  
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const isBookmarked = bookmarks.some(b => b.nctId === nctId);
  const bookmarkedTrial = bookmarks.find(b => b.nctId === nctId);

  useEffect(() => {
    const fetchTrial = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE}/trial/${nctId}`);
        setTrial(response.data);
        if (bookmarkedTrial) {
          setNotes(bookmarkedTrial.notes || '');
        }
      } catch (err) {
        console.error('Error fetching trial detail:', err);
        setError(err.response?.data?.detail || 'Failed to load clinical trial details.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrial();
  }, [nctId, bookmarkedTrial]);

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleSaveNotes = () => {
    updateBookmarkNotes(nctId, notes);
    setIsEditingNotes(false);
  };

  if (loading) {
    return (
      <div className="insights-loading" style={{ minHeight: '80vh' }}>
        <div className="insights-spinner"></div>
        <p>Loading trial details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-content" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem', border: '1px solid #FCA5A5' }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Trial</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
          <button className="search-button" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!trial) return null;

  const criteria = parseEligibility(trial.eligibilityCriteria);

  return (
    <div className="main-content" style={{ padding: '2rem 1.5rem', backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 150px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation & Actions Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button 
            onClick={() => navigate(-1)} 
            className="nav-link" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--primary-color)' }}
          >
            &larr; Back to Results
          </button>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleShare}
              className="share-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: copied ? 'var(--accent-light)' : 'var(--card-bg)',
                border: '1.5px solid',
                borderColor: copied ? 'var(--accent-color)' : 'var(--border-color)',
                borderRadius: '8px',
                padding: '0.6rem 1.2rem',
                cursor: 'pointer',
                color: copied ? 'var(--accent-color)' : 'var(--text-primary)',
                fontWeight: 600,
                transition: 'all 0.2s',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              {copied ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              )}
              {copied ? 'Copied Share Link!' : 'Share Study'}
            </button>

            <button
              onClick={() => toggleBookmark(trial)}
              className="search-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: isBookmarked ? '#F59E0B' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: 'var(--card-shadow)'
              }}
            >
              <StarIcon filled={isBookmarked} />
              {isBookmarked ? 'Saved to Bookmarks' : 'Save to Bookmarks'}
            </button>
          </div>
        </div>

        {/* Trial Main Info Panel */}
        <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span className="nct-badge" style={{ fontSize: '0.9rem', padding: '0.3rem 0.6rem' }}>{trial.nctId}</span>
              <h1 style={{ fontSize: '2rem', marginTop: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>{trial.title}</h1>
              {trial.officialTitle && trial.officialTitle !== trial.title && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Official Title: {trial.officialTitle}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              {trial.phase && (
                <span className={`phase-badge ${trial.phase.toLowerCase().replace(/[\s/]/g, '-')}`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem', borderRadius: '8px' }}>
                  {trial.phase}
                </span>
              )}
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.3rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: trial.status === 'Recruiting' ? 'var(--accent-light)' : '#E2E8F0',
                color: trial.status === 'Recruiting' ? 'var(--accent-color)' : '#475569'
              }}>
                {trial.status}
              </span>
              {trial.closingSoonStatus && (
                <span className="closing-soon-badge animate-pulse-badge" style={{
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  padding: '0.3rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFFBEB',
                  color: '#D97706',
                  border: '1px solid #FCD34D'
                }}>
                  ⏳ Closing: {trial.closingSoonStatus}
                </span>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
              <BuildingIcon />
              <span>Sponsor: <strong>{trial.sponsor}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
              <MapPinIcon />
              <span>Primary Location: <strong>{trial.location}</strong></span>
            </div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
          
          {/* Main Content Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Description */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem' }}>
                Study Description
              </h3>
              <p style={{ color: 'var(--text-primary)', lineHeight: '1.7', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                {trial.eligibilitySummary || "No detailed description provided."}
              </p>
            </div>

            {/* Eligibility Criteria */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem' }}>
                Eligibility Criteria
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: '#059669', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem' }}>
                    ✔ Inclusion Criteria
                  </h4>
                  {criteria.inclusion.length > 0 ? (
                    <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      {criteria.inclusion.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.95rem' }}>No explicit inclusion criteria listed.</p>
                  )}
                </div>

                <div>
                  <h4 style={{ color: '#DC2626', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.05rem' }}>
                    ❌ Exclusion Criteria
                  </h4>
                  {criteria.exclusion.length > 0 ? (
                    <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      {criteria.exclusion.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.95rem' }}>No explicit exclusion criteria listed.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Notes (Only for Bookmarked) */}
            {isBookmarked && (
              <div className="glass-panel" style={{ padding: '2rem', border: '1.5px solid #F59E0B' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📝 My Private Notes &amp; Questions
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Write down any questions or concerns you have about this study. These notes will be saved and included on the report exported for your doctor.
                </p>

                {isEditingNotes ? (
                  <div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Does my prior therapy exclude me? Ask Dr. Smith if this center is participating..."
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border-color)',
                        marginBottom: '1rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={handleSaveNotes} 
                        className="search-button"
                        style={{ padding: '0.4rem 1.2rem', fontSize: '0.9rem', borderRadius: '6px' }}
                      >
                        Save Notes
                      </button>
                      <button 
                        onClick={() => {
                          setNotes(bookmarkedTrial.notes || '');
                          setIsEditingNotes(false);
                        }} 
                        style={{
                          background: 'none',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.4rem 1.2rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {notes ? (
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        lineHeight: '1.5',
                        marginBottom: '1rem',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {notes}
                      </div>
                    ) : (
                      <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                        No notes or questions saved yet.
                      </p>
                    )}
                    <button 
                      onClick={() => setIsEditingNotes(true)}
                      className="search-button"
                      style={{
                        padding: '0.4rem 1.2rem',
                        fontSize: '0.9rem',
                        borderRadius: '6px',
                        backgroundColor: '#D97706',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {notes ? 'Edit Notes' : 'Add Notes / Questions'}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Sidebar Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Study Contacts */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📞 Contact Coordinators
              </h4>
              {trial.contacts && trial.contacts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trial.contacts.map((contact, idx) => (
                    <div key={idx} style={{ fontSize: '0.9rem', borderBottom: idx < trial.contacts.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: idx < trial.contacts.length - 1 ? '1.25rem' : 0 }}>
                      {contact.name && <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{contact.name}</div>}
                      {contact.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <PhoneIcon /> <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                          <MailIcon /> <a href={`mailto:${contact.email}`} style={{ wordBreak: 'break-all' }}>{contact.email}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                  No central contact information is listed for this study. Check clinicaltrials.gov for local center facilities.
                </p>
              )}
            </div>

            {/* Study Timeline */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarIcon /> Key Milestones
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Study Started</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{trial.startDate || 'Unknown'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Completion</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{trial.completionDate || 'Unknown'}</div>
                </div>
              </div>
            </div>

            {/* External Registry Registry Link */}
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Official Registry Study ID</h4>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                {trial.nctId}
              </div>
              <a
                href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-button"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View on ClinicalTrials.gov
              </a>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default TrialDetailPage;
