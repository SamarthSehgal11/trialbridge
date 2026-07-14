import React from 'react';

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

// Helper function to parse raw eligibility text
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
    inclusion: parseBullets(inclusionText).slice(0, 5), // Limit to top 5 for table readability
    exclusion: parseBullets(exclusionText).slice(0, 5)
  };
};

const calculateTimelineProgress = (start, end) => {
  if (!start || !end || start === 'Unknown' || end === 'Unknown') return 50;
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

const TrialComparisonModal = ({ isOpen, onClose, trials, onRemove }) => {
  if (!isOpen) return null;

  return (
    <div className="compare-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="compare-modal-content glass-panel animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="compare-modal-header">
          <div>
            <h2 className="compare-modal-title">📊 Trial Comparison Side-by-Side</h2>
            <p className="compare-modal-subtitle">Comparing {trials.length} selected studies</p>
          </div>
          <button className="compare-modal-close" onClick={onClose} aria-label="Close Comparison">
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable Comparison Area */}
        <div className="compare-modal-body">
          {trials.length === 0 ? (
            <div className="compare-empty-state">
              <p>No trials selected for comparison. Close this modal and select trials to compare.</p>
            </div>
          ) : (
            <div className="compare-table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th className="compare-table-label-col">Metric</th>
                    {trials.map(trial => (
                      <th key={trial.nctId} className="compare-table-data-col">
                        <div className="compare-col-header">
                          <span className="nct-badge">{trial.nctId}</span>
                          <button 
                            className="compare-remove-col-btn"
                            onClick={() => onRemove(trial)}
                            title="Remove from comparison"
                          >
                            <TrashIcon /> Remove
                          </button>
                        </div>
                        <h4 className="compare-trial-title-cell">{trial.title}</h4>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Phase & Status */}
                  <tr>
                    <td className="compare-label-cell">Phase &amp; Status</td>
                    {trials.map(trial => (
                      <td key={trial.nctId}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                          <span className={`phase-badge ${trial.phase.toLowerCase().replace(/[\s/]/g, '-')}`}>
                            {trial.phase || 'N/A'}
                          </span>
                          <span className={`status-badge-inline ${trial.status.toLowerCase() === 'recruiting' ? 'recruiting' : ''}`} style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            backgroundColor: trial.status === 'Recruiting' ? 'var(--accent-light)' : '#E2E8F0',
                            color: trial.status === 'Recruiting' ? 'var(--accent-color)' : '#475569'
                          }}>
                            {trial.status}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Urgency Badge */}
                  <tr>
                    <td className="compare-label-cell">Urgency</td>
                    {trials.map(trial => (
                      <td key={trial.nctId}>
                        {trial.closingSoonStatus ? (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 650,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: '#FFFBEB',
                            color: '#D97706',
                            border: '1px solid #FCD34D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            ⏳ Closing: {trial.closingSoonStatus}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Standard timeline</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Sponsor */}
                  <tr>
                    <td className="compare-label-cell">Lead Sponsor</td>
                    {trials.map(trial => (
                      <td key={trial.nctId} className="compare-sponsor-cell">
                        {trial.sponsor}
                      </td>
                    ))}
                  </tr>

                  {/* Location & Distance */}
                  <tr>
                    <td className="compare-label-cell">Primary Location</td>
                    {trials.map(trial => (
                      <td key={trial.nctId}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong>{trial.location}</strong>
                          {trial.distance !== null && (
                            <div style={{ color: 'var(--primary-color)', fontWeight: 600, marginTop: '0.25rem' }}>
                              📍 {trial.distance} miles away
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Timeline Progress */}
                  <tr>
                    <td className="compare-label-cell">Timeline Progress</td>
                    {trials.map(trial => {
                      const pct = calculateTimelineProgress(trial.startDate, trial.completionDate);
                      return (
                        <td key={trial.nctId}>
                          <div style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                              <span>Start: {trial.startDate}</span>
                              <span>End: {trial.completionDate}</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--primary-color)' }}></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'right' }}>
                              {pct}% elapsed
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Eligibility Summary */}
                  <tr>
                    <td className="compare-label-cell">Eligibility Summary</td>
                    {trials.map(trial => (
                      <td key={trial.nctId} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {trial.eligibilitySummary || 'N/A'}
                      </td>
                    ))}
                  </tr>

                  {/* Inclusion Criteria */}
                  <tr>
                    <td className="compare-label-cell">Key Inclusion Criteria</td>
                    {trials.map(trial => {
                      const criteria = parseEligibility(trial.eligibilityCriteria);
                      return (
                        <td key={trial.nctId}>
                          {criteria.inclusion.length > 0 ? (
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                              {criteria.inclusion.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Check official listing</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Exclusion Criteria */}
                  <tr>
                    <td className="compare-label-cell">Key Exclusion Criteria</td>
                    {trials.map(trial => {
                      const criteria = parseEligibility(trial.eligibilityCriteria);
                      return (
                        <td key={trial.nctId}>
                          {criteria.exclusion.length > 0 ? (
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>
                              {criteria.exclusion.map((item, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Check official listing</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialComparisonModal;
