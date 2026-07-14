import React, { useEffect, useState } from 'react';

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const UserCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);

const UserXIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="18" y1="8" x2="23" y2="13" />
    <line x1="23" y1="8" x2="18" y2="13" />
  </svg>
);

// Helper function to parse raw eligibility text into inclusion and exclusion bullet points
const parseEligibility = (criteriaText) => {
  if (!criteriaText) return { inclusion: [], exclusion: [] };

  let inclusionText = '';
  let exclusionText = '';

  const lowerText = criteriaText.toLowerCase();
  
  // Search for the start of the exclusion criteria section
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
    // Find the next line break after the keyword to start exclusions
    const rest = criteriaText.substring(splitIdx);
    const lineBreak = rest.indexOf('\n');
    exclusionText = lineBreak !== -1 ? rest.substring(lineBreak) : rest;
  } else {
    inclusionText = criteriaText;
  }

  // Clean lines and filter out header markings
  const parseBullets = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (!line) return false;
        // Skip header lines
        const l = line.toLowerCase();
        if (l.startsWith('inclusion criteria') || l.startsWith('exclusion criteria') || l.startsWith('eligibility criteria')) return false;
        return true;
      })
      // Clean bullet prefix characters
      .map(line => line.replace(/^[\s*\-•+]+/, '').trim())
      .filter(line => line.length > 5);
  };

  return {
    inclusion: parseBullets(inclusionText).slice(0, 10), // Limit to top 10 for readability
    exclusion: parseBullets(exclusionText).slice(0, 10)
  };
};

// Calculate timeline progress width
const calculateTimelineProgress = (start, end) => {
  if (!start || !end || start === 'Unknown' || end === 'Unknown') return 50; // default middle
  
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 50;
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    
    if (totalDuration <= 0) return 50;
    
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  } catch (e) {
    return 50;
  }
};

const TrialDetailDrawer = ({ trial, isOpen, onClose }) => {
  const [eligibility, setEligibility] = useState({ inclusion: [], exclusion: [] });
  const [timelineProgress, setTimelineProgress] = useState(50);

  useEffect(() => {
    if (trial) {
      setEligibility(parseEligibility(trial.eligibilityCriteria));
      setTimelineProgress(calculateTimelineProgress(trial.startDate, trial.completionDate));
      // Lock page body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [trial]);

  if (!trial) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
        id="detail-drawer-backdrop"
      >
        {/* Panel */}
        <div 
          className="drawer-panel" 
          onClick={(e) => e.stopPropagation()}
          id="detail-drawer-panel"
        >
          {/* Header */}
          <div className="drawer-header">
            <div className="drawer-header-left">
              <span className="nct-badge">{trial.nctId}</span>
              <h2 className="drawer-title">{trial.title}</h2>
              {trial.phase && (
                <div style={{ marginTop: '0.25rem' }}>
                  <span className={`phase-badge ${trial.phase.toLowerCase().replace(/[\s/]/g, '-')}`}>
                    {trial.phase}
                  </span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Status: <strong>{trial.status}</strong>
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="drawer-close-btn" 
              id="detail-drawer-close"
              aria-label="Close drawer"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="drawer-content">
            {/* Sponsor */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Sponsor</h3>
              <p className="drawer-desc-para" style={{ fontWeight: 500 }}>
                {trial.sponsor}
              </p>
            </div>

            {/* Description */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Study Summary</h3>
              <p className="drawer-desc-para">
                {trial.officialTitle && trial.officialTitle !== trial.title && (
                  <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    Official Title: {trial.officialTitle}
                  </strong>
                )}
                {trial.eligibilitySummary && (
                  <span style={{ display: 'block', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', borderLeft: '3px solid var(--primary-color)', backgroundColor: 'var(--bg-color)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {trial.eligibilitySummary}
                  </span>
                )}
              </p>
              {/* Detailed criteria / description if description exists */}
              <p className="drawer-desc-para" style={{ whiteSpace: 'pre-line', fontSize: '0.95rem' }}>
                {trial.eligibilityCriteria ? trial.eligibilityCriteria.split('\n\n')[0] : 'No description available.'}
              </p>
            </div>

            {/* Timeline */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Timeline</h3>
              <div className="timeline-vis-container">
                <div className="timeline-dates-row">
                  <span><strong>Start:</strong> {trial.startDate}</span>
                  <span><strong>Estimated Completion:</strong> {trial.completionDate}</span>
                </div>
                <div className="timeline-bar-track">
                  <div 
                    className="timeline-bar-fill" 
                    style={{ 
                      left: '0%', 
                      width: `${timelineProgress}%`,
                      backgroundColor: trial.status === 'Completed' ? 'var(--accent-color)' : 'var(--primary-color)'
                    }} 
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                  {trial.status === 'Completed' ? 'Study completed.' : `Trial timeline in progress (~${timelineProgress}% duration elapsed).`}
                </p>
              </div>
            </div>

            {/* Eligibility Split Panels */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Eligibility Criteria</h3>
              
              {eligibility.inclusion.length === 0 && eligibility.exclusion.length === 0 ? (
                <p className="drawer-desc-para" style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>
                  Refer to the official ClinicalTrials.gov page for detailed inclusion and exclusion requirements.
                </p>
              ) : (
                <div className="criteria-container">
                  {/* Who Qualifies */}
                  <div className="qualifies-box">
                    <h4>
                      <UserCheckIcon />
                      Who Qualifies
                    </h4>
                    {eligibility.inclusion.length > 0 ? (
                      <ul className="criteria-list">
                        {eligibility.inclusion.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not specified.</p>
                    )}
                  </div>

                  {/* Who is Excluded */}
                  <div className="excluded-box">
                    <h4>
                      <UserXIcon />
                      Who is Excluded
                    </h4>
                    {eligibility.exclusion.length > 0 ? (
                      <ul className="criteria-list">
                        {eligibility.exclusion.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not specified.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Location & Contact */}
            <div className="drawer-section">
              <h3 className="drawer-section-title">Location &amp; Contacts</h3>
              <p className="drawer-desc-para" style={{ marginBottom: '0.75rem' }}>
                📍 <strong>Primary site:</strong> {trial.location}
              </p>
              {trial.contacts && trial.contacts.length > 0 ? (
                <div style={{ backgroundColor: 'var(--bg-color)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Study Contact Info:</h5>
                  {trial.contacts.map((contact, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', marginBottom: idx < trial.contacts.length - 1 ? '0.75rem' : '0' }}>
                      {contact.name && <p><strong>Name:</strong> {contact.name}</p>}
                      {contact.phone && <p><strong>Phone:</strong> {contact.phone}</p>}
                      {contact.email && <p><strong>Email:</strong> <a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="drawer-desc-para" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                  No specific contact details are available. Please consult the registry link below for coordinating center inquiries.
                </p>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="drawer-footer">
            <a 
              href={`https://clinicaltrials.gov/study/${trial.nctId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="drawer-footer-btn"
              id="detail-drawer-external-link"
            >
              View Official ClinicalTrials.gov Page
              <ExternalLinkIcon />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrialDetailDrawer;
