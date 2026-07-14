import React, { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const StarIcon = ({ filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? '#F1C40F' : 'none'} stroke={filled ? '#F1C40F' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01" />
  </svg>
);

// ---------------------------------------------------------------------------
// BookmarkNotes sub-component
// ---------------------------------------------------------------------------
const BookmarkNotes = ({ trial, onSave }) => {
  const [notes, setNotes] = useState(trial.notes || '');
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'

  useEffect(() => {
    setNotes(trial.notes || '');
  }, [trial.notes]);

  const handleSave = async (updatedNotes) => {
    if (updatedNotes === trial.notes) return;
    setSaveState('saving');
    try {
      await onSave(trial.nctId, updatedNotes);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      setSaveState('idle');
    }
  };

  const handleChipClick = (suggestion) => {
    const trimmedNotes = notes.trim();
    const updated = trimmedNotes ? `${trimmedNotes}\n- ${suggestion}` : `- ${suggestion}`;
    setNotes(updated);
    handleSave(updated);
  };

  const suggestions = [
    'Side effects & safety?',
    'Travel reimbursement?',
    'Schedule flexibility?',
    'Placebo control chance?',
  ];

  return (
    <div className="bookmark-notes-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className="bookmark-notes-header">
        <div className="bookmark-notes-header-title">
          <svg className="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <label htmlFor={`notes-${trial.nctId}`} className="bookmark-notes-label">
            Notes &amp; Questions for your Doctor
          </label>
        </div>

        <div className={`notes-save-status ${saveState}`}>
          {saveState === 'saving' && (
            <>
              <svg className="spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="12" height="12">
                <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
              </svg>
              <span>Saving...</span>
            </>
          )}
          {saveState === 'saved' && (
            <>
              <svg className="check-icon animate-pop-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" width="12" height="12">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="animate-fade-in">Saved to profile</span>
            </>
          )}
        </div>
      </div>

      <textarea
        id={`notes-${trial.nctId}`}
        className="bookmark-notes-textarea"
        placeholder="Type questions or select suggested topics below to compile notes for your healthcare provider..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => handleSave(notes)}
      />

      <div className="notes-suggestions">
        <span className="suggestions-title">Suggestions:</span>
        <div className="suggestions-chips">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="suggestion-chip"
              onClick={() => handleChipClick(suggestion)}
              type="button"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TrialCard
// ---------------------------------------------------------------------------
/**
 * TrialCard — renders a single search result card.
 *
 * @param {object} props
 * @param {object}   props.trial
 * @param {boolean}  props.isBookmarked
 * @param {boolean}  props.isBookmarkView
 * @param {object}   props.screeningParams
 * @param {string|null} props.copiedTrialId
 * @param {object[]} props.selectedCompareTrials
 * @param {Function} props.onBookmark
 * @param {Function} props.onShare
 * @param {Function} props.onDrawerOpen
 * @param {Function} props.onCompareToggle
 * @param {Function} props.onSaveNotes
 */
const TrialCard = ({
  trial,
  isBookmarked,
  isBookmarkView,
  screeningParams,
  copiedTrialId,
  selectedCompareTrials,
  onBookmark,
  onShare,
  onDrawerOpen,
  onCompareToggle,
  onSaveNotes,
}) => {
  return (
    <div
      key={trial.nctId}
      className="result-card animate-fade-in"
      onClick={() => onDrawerOpen(trial)}
      id={`trial-card-${trial.nctId}`}
    >
      {/* Header */}
      <div className="result-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <h3 className="result-card-title">{trial.title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {isBookmarked && (
            <div className="compare-checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                id={`compare-check-${trial.nctId}`}
                checked={selectedCompareTrials.some(t => t.nctId === trial.nctId)}
                onChange={(e) => onCompareToggle(trial, e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor={`compare-check-${trial.nctId}`} style={{ cursor: 'pointer', fontWeight: 500 }}>Compare</label>
            </div>
          )}
          <span className="nct-badge">{trial.nctId}</span>
        </div>
      </div>

      {/* Badges Row */}
      <div className="badges-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        {trial.phase && (
          <span className={`phase-badge ${trial.phase.toLowerCase().replace(/[\s/]/g, '-')}`}>
            {trial.phase}
          </span>
        )}
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '6px',
          backgroundColor: trial.status === 'Recruiting' ? 'var(--accent-light)' : '#E2E8F0',
          color: trial.status === 'Recruiting' ? 'var(--accent-color)' : '#475569',
        }}>
          {trial.status}
        </span>
        {trial.closingSoonStatus && (
          <span className="closing-soon-badge animate-pulse-badge" style={{
            fontSize: '0.75rem', fontWeight: 650, padding: '0.2rem 0.5rem', borderRadius: '6px',
            backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FCD34D',
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          }}>
            ⏳ Closing: {trial.closingSoonStatus}
          </span>
        )}
      </div>

      {/* Eligibility Screening Status */}
      {screeningParams && trial.eligibilityStatus && (
        <div className="card-eligibility-status-row" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center' }}>
          {trial.eligibilityStatus.eligible ? (
            <span className="eligibility-status-badge eligible" style={{
              fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '6px',
              backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
            }}>
              🧬 Eligible (Screener Matched)
            </span>
          ) : (
            <div className="eligibility-status-badge ineligible" style={{
              fontSize: '0.75rem', fontWeight: 500, padding: '0.25rem 0.6rem', borderRadius: '6px',
              backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', width: '100%',
            }}>
              <strong style={{ fontWeight: 700 }}>🧬 Ineligible:</strong>{' '}
              <span>{trial.eligibilityStatus.reasons.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Match Score Bar */}
      {trial.matchScore && (
        <div className="match-score-container">
          <span className="match-score-label">{trial.matchScore}% match</span>
          <div className="match-score-track">
            <div className="match-score-fill" style={{ width: `${trial.matchScore}%` }} />
          </div>
        </div>
      )}

      {/* Meta details list */}
      <div className="trial-meta-list">
        <div className="trial-meta-item">
          <BuildingIcon />
          <span>Sponsor: <strong>{trial.sponsor}</strong></span>
        </div>
        <div className="trial-meta-item">
          <MapPinIcon />
          <span>
            Primary Location: <strong>{trial.location}</strong>
            {trial.distance !== null && (
              <span style={{ color: 'var(--accent-color)', fontWeight: 600, marginLeft: '0.35rem' }}>
                ({trial.distance} miles away)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Brief Eligibility block */}
      {trial.eligibilitySummary && (
        <div className="eligibility-summary-box">{trial.eligibilitySummary}</div>
      )}

      {isBookmarkView && (
        <BookmarkNotes trial={trial} onSave={onSaveNotes} />
      )}

      {/* Footer Buttons */}
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        {/* Bookmark Button */}
        <button
          onClick={() => onBookmark(trial)}
          className={`bookmark-action-btn ${isBookmarked ? 'active' : ''}`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark trial'}
          id={`bookmark-toggle-${trial.nctId}`}
        >
          <StarIcon filled={isBookmarked} />
          <span style={{ fontSize: '0.8rem', marginLeft: '0.25rem', fontWeight: 500 }}>
            {isBookmarked ? 'Saved' : 'Save Trial'}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={() => onShare(trial.nctId)}
          className="share-action-btn"
          style={{
            display: 'flex', alignItems: 'center',
            backgroundColor: copiedTrialId === trial.nctId ? 'var(--accent-light)' : 'transparent',
            border: '1px solid',
            borderColor: copiedTrialId === trial.nctId ? 'var(--accent-color)' : 'var(--border-color)',
            borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer',
            color: copiedTrialId === trial.nctId ? 'var(--accent-color)' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
          id={`share-btn-${trial.nctId}`}
        >
          {copiedTrialId === trial.nctId ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-scale-in">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          )}
          <span style={{ fontSize: '0.8rem', marginLeft: '0.25rem', fontWeight: 500 }}>
            {copiedTrialId === trial.nctId ? 'Copied!' : 'Share'}
          </span>
        </button>

        {/* External Registry CTA */}
        <a
          href={`https://clinicaltrials.gov/study/${trial.nctId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cta-button"
          id={`external-cta-${trial.nctId}`}
        >
          View Registry
          <ExternalLinkIcon />
        </a>
      </div>
    </div>
  );
};

export default TrialCard;
