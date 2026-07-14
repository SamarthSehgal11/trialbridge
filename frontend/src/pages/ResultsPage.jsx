import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTrial } from '../context/TrialContext';

import TrialDetailDrawer from '../components/TrialDetailDrawer';
import TrialComparisonModal from '../components/TrialComparisonModal';
import FilterSidebar from '../components/FilterSidebar';
import TrialCard from '../components/TrialCard';
import ScreeningPanel from '../components/ScreeningPanel';

import { useTrialFilters } from '../hooks/useTrialFilters';
import { useMapData } from '../hooks/useMapData';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ---------------------------------------------------------------------------
// Inline icons used only in this page-level orchestrator
// ---------------------------------------------------------------------------
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const InfoIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-text skeleton-title"></div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <div className="skeleton-text skeleton-badge"></div>
      <div className="skeleton-text skeleton-badge"></div>
    </div>
    <div className="skeleton-text skeleton-bar"></div>
    <div className="skeleton-text skeleton-paragraph"></div>
  </div>
);

// ---------------------------------------------------------------------------
// ResultsPage — orchestrator
// ---------------------------------------------------------------------------
const ResultsPage = () => {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const navigate = useNavigate();

  const {
    searchResults, bookmarks, isLoading, searchError,
    executeSearch, toggleBookmark, updateBookmarkNotes,
    searchQuery, sessionId, screeningParams, setScreeningParams,
  } = useTrial();

  const [localQuery, setLocalQuery]               = useState('');
  const [selectedTrial, setSelectedTrial]         = useState(null);
  const [isDrawerOpen, setIsDrawerOpen]           = useState(false);
  const [selectedCompareTrials, setSelectedCompareTrials] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [copiedTrialId, setCopiedTrialId]         = useState(null);
  const [isScreenerOpen, setIsScreenerOpen]       = useState(false);
  const [suggestions, setSuggestions]             = useState([]);
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [searchHistory, setSearchHistory]         = useState([]);
  const autocompleteRef = useRef(null);

  const isBookmarkView = filterParam === 'bookmarks';
  const activeData = isBookmarkView ? bookmarks : searchResults;

  // Hooks for filter state / logic and distance / sort logic
  const {
    selectedPhases, selectedStatuses, selectedAges, selectedConditions,
    handlePhaseChange, handleStatusChange, handleAgeChange, handleConditionChange,
    clearAllFilters, filteredResults,
  } = useTrialFilters(activeData);

  const { userCoords, sortBy, setSortBy, finalResults } = useMapData(filteredResults, isBookmarkView);

  // On mount: sync query, load history, geolocation is handled by useMapData
  useEffect(() => {
    setLocalQuery(searchQuery);
    const history = JSON.parse(localStorage.getItem('trialbridge_search_history') || '[]');
    setSearchHistory(history);
  }, [searchQuery]);

  // Keep compare selections in sync with bookmarks list
  useEffect(() => {
    setSelectedCompareTrials(prev => prev.filter(t => bookmarks.some(b => b.nctId === t.nctId)));
  }, [bookmarks]);

  // Autocomplete fetch with debounce
  useEffect(() => {
    if (!localQuery || !localQuery.trim()) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/autocomplete`, { params: { q: localQuery } });
        setSuggestions(res.data);
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localQuery]);

  // Click-outside to close autocomplete
  useEffect(() => {
    const handler = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveSearchToHistory = (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    let history = JSON.parse(localStorage.getItem('trialbridge_search_history') || '[]');
    history = history.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
    history.unshift(trimmed);
    history = history.slice(0, 5);
    localStorage.setItem('trialbridge_search_history', JSON.stringify(history));
    setSearchHistory(history);
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (localQuery && localQuery.trim()) {
      saveSearchToHistory(localQuery);
      executeSearch(localQuery.trim());
      if (isBookmarkView) navigate('/results');
    }
  };

  const handleShare = (nctId) => {
    const shareUrl = `${window.location.origin}/trial/${nctId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedTrialId(nctId);
      setTimeout(() => setCopiedTrialId(null), 2000);
    }).catch(err => console.error('Failed to copy:', err));
  };

  const handleCompareToggle = (trial, checked) => {
    if (checked) {
      if (selectedCompareTrials.length >= 3) {
        alert('You can select up to 3 trials to compare.');
        return;
      }
      setSelectedCompareTrials(prev => [...prev, trial]);
    } else {
      setSelectedCompareTrials(prev => prev.filter(t => t.nctId !== trial.nctId));
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '80vh', paddingBottom: '3rem' }}>

      {/* Top Search Bar Row */}
      <div style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <form onSubmit={handleQuerySubmit} style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px' }}>
            <div ref={autocompleteRef} className="search-input-wrapper" style={{ padding: '0.2rem 0.5rem 0.2rem 1rem', width: '100%', borderRadius: '8px', position: 'relative' }}>
              <span className="search-icon"><SearchIcon /></span>
              <input
                type="text" className="search-input" id="results-search-input"
                style={{ padding: '0.5rem 0' }} value={localQuery} autoComplete="off"
                onChange={(e) => { setLocalQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. lung cancer in older adults..."
              />
              {showSuggestions && (
                (localQuery && suggestions.length > 0) ? (
                  <ul className="autocomplete-dropdown glass-panel" id="results-autocomplete-dropdown">
                    {suggestions.map((sug, idx) => (
                      <li key={idx} className="autocomplete-item" onClick={() => {
                        setLocalQuery(sug); setShowSuggestions(false);
                        saveSearchToHistory(sug); executeSearch(sug);
                        if (isBookmarkView) navigate('/results');
                      }}>{sug}</li>
                    ))}
                  </ul>
                ) : (!localQuery && searchHistory.length > 0) ? (
                  <ul className="autocomplete-dropdown glass-panel" id="results-history-dropdown">
                    <li className="autocomplete-header" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Recent Searches</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSearchHistory([]); localStorage.removeItem('trialbridge_search_history'); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                        Clear All
                      </button>
                    </li>
                    {searchHistory.map((hist, idx) => (
                      <li key={idx} className="autocomplete-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => { setLocalQuery(hist); setShowSuggestions(false); saveSearchToHistory(hist); executeSearch(hist); if (isBookmarkView) navigate('/results'); }}>
                        <span>{hist}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); const nh = searchHistory.filter((_, i) => i !== idx); setSearchHistory(nh); localStorage.setItem('trialbridge_search_history', JSON.stringify(nh)); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1rem', padding: '0 0.5rem', lineHeight: 1 }}>
                          &times;
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null
              )}
            </div>
            <button type="submit" className="search-button" id="results-search-submit" style={{ borderRadius: '8px', padding: '0 1.5rem' }}>Search</button>
          </form>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="results-container">

        <FilterSidebar
          selectedPhases={selectedPhases} selectedStatuses={selectedStatuses}
          selectedAges={selectedAges} selectedConditions={selectedConditions}
          onPhaseChange={handlePhaseChange} onStatusChange={handleStatusChange}
          onAgeChange={handleAgeChange} onConditionChange={handleConditionChange}
          onClearAll={clearAllFilters}
        />

        {/* Right Content Column */}
        <section className="results-content">

          {/* Results Metadata Row */}
          <div className="results-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="results-count-badge">
                {isLoading ? '...' : `${finalResults.length} ${isBookmarkView ? 'Saved' : 'Matching'} Trial${finalResults.length !== 1 ? 's' : ''}`}
              </span>
              <button className="screener-trigger-btn" onClick={() => setIsScreenerOpen(true)} id="screener-trigger-btn">
                🧬 {screeningParams ? 'Update Eligibility Screen' : 'Screen My Eligibility'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                className="sort-select" id="sort-select"
                value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="match">Sort: Best Match</option>
                <option value="distance" disabled={!userCoords}>Sort: Nearest Location</option>
              </select>
              {isBookmarkView && finalResults.length > 0 && (
                <>
                  {selectedCompareTrials.length >= 2 && (
                    <button className="search-button animate-scale-in" onClick={() => setIsCompareModalOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} id="open-compare-modal">
                      Compare ({selectedCompareTrials.length})
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.85rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
                    id="print-report-btn"
                  >
                    🖨 Export PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Active Screener Chips */}
          {screeningParams && (
            <div className="active-screener-chips">
              <span className="screener-chips-title">Active Screener:</span>
              {screeningParams.age && <span className="screener-chip">Age: {screeningParams.age}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.age; setScreeningParams(Object.keys(n).length > 0 ? n : null); executeSearch(searchQuery, Object.keys(n).length > 0 ? n : null); }}>&times;</button></span>}
              {screeningParams.gender && screeningParams.gender !== 'ALL' && <span className="screener-chip">Gender: {screeningParams.gender}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.gender; const f = Object.keys(n).length > 0 ? n : null; setScreeningParams(f); executeSearch(searchQuery, f); }}>&times;</button></span>}
              {screeningParams.healthy !== undefined && <span className="screener-chip">{screeningParams.healthy ? 'Healthy Volunteer' : 'Patient (Diagnosed)'}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.healthy; const f = Object.keys(n).length > 0 ? n : null; setScreeningParams(f); executeSearch(searchQuery, f); }}>&times;</button></span>}
              {screeningParams.prior_treatments && <span className="screener-chip">Prior treatments: {screeningParams.prior_treatments}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.prior_treatments; const f = Object.keys(n).length > 0 ? n : null; setScreeningParams(f); executeSearch(searchQuery, f); }}>&times;</button></span>}
              {screeningParams.current_meds && <span className="screener-chip">Meds: {screeningParams.current_meds}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.current_meds; const f = Object.keys(n).length > 0 ? n : null; setScreeningParams(f); executeSearch(searchQuery, f); }}>&times;</button></span>}
              {screeningParams.metastasis !== undefined && <span className="screener-chip">{screeningParams.metastasis ? 'Metastatic Disease' : 'Localized/Non-metastatic'}<button className="chip-close-btn" onClick={() => { const n = {...screeningParams}; delete n.metastasis; const f = Object.keys(n).length > 0 ? n : null; setScreeningParams(f); executeSearch(searchQuery, f); }}>&times;</button></span>}
              <button className="clear-screener-btn" onClick={() => { setScreeningParams(null); executeSearch(searchQuery, null); }}>Clear Screener</button>
            </div>
          )}

          {/* Error State */}
          {searchError && !isLoading && (
            <div className="empty-state" style={{ border: '1px solid #F8D7DA', backgroundColor: '#FDF2F2' }}>
              <h3 className="empty-state-title" style={{ color: '#721C24' }}>Connection Error</h3>
              <p className="empty-state-desc" style={{ color: '#721C24' }}>{searchError}</p>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}

          {/* No Results Empty State */}
          {!isLoading && !searchError && finalResults.length === 0 && (
            <div className="empty-state">
              <InfoIcon />
              <h3 className="empty-state-title">No matching clinical trials found</h3>
              <p className="empty-state-desc">
                {isBookmarkView
                  ? "You haven't saved any clinical trials yet. Browse matching trials and click the star icon to save them."
                  : "We couldn't find active studies matching your search and filter criteria. Try describing the condition using alternate terms or clearing your filters."}
              </p>
              {!isBookmarkView && (
                <button onClick={() => { clearAllFilters(); executeSearch(searchQuery); }} className="search-button" style={{ margin: '0 auto', display: 'block' }} id="empty-state-reset">
                  Reset Search &amp; Filters
                </button>
              )}
            </div>
          )}

          {/* Trial Cards */}
          {!isLoading && !searchError && finalResults.map((trial) => (
            <TrialCard
              key={trial.nctId}
              trial={trial}
              isBookmarked={bookmarks.some(b => b.nctId === trial.nctId)}
              isBookmarkView={isBookmarkView}
              screeningParams={screeningParams}
              copiedTrialId={copiedTrialId}
              selectedCompareTrials={selectedCompareTrials}
              onBookmark={toggleBookmark}
              onShare={handleShare}
              onDrawerOpen={(t) => { setSelectedTrial(t); setIsDrawerOpen(true); }}
              onCompareToggle={handleCompareToggle}
              onSaveNotes={updateBookmarkNotes}
            />
          ))}

        </section>
      </div>

      {/* Trial Detail Drawer */}
      <TrialDetailDrawer trial={selectedTrial} isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); setSelectedTrial(null); }} />

      {/* Trial Comparison Modal */}
      <TrialComparisonModal
        isOpen={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)}
        trials={selectedCompareTrials}
        onRemove={(trial) => setSelectedCompareTrials(prev => prev.filter(t => t.nctId !== trial.nctId))}
      />

      {/* Eligibility Screener Modal */}
      <ScreeningPanel
        isOpen={isScreenerOpen}
        onClose={() => setIsScreenerOpen(false)}
        onSubmit={(params) => {
          setScreeningParams(params);
          executeSearch(searchQuery, params);
        }}
      />

      {/* Print-Only Report Section */}
      <div className="print-report-section" style={{ display: 'none' }}>
        <div style={{ borderBottom: '2px solid #1A6BCC', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <h1 style={{ color: '#1A6BCC', fontFamily: 'var(--font-heading)', fontSize: '22pt', marginBottom: '0.5rem' }}>TrialBridge Clinical Trial Report</h1>
          <p style={{ color: '#6B7280', fontSize: '9.5pt', margin: 0 }}>Generated on {new Date().toLocaleDateString()} &bull; Session: {sessionId}</p>
        </div>
        <p style={{ marginBottom: '2rem', fontSize: '10.5pt', lineHeight: '1.6' }}>The following matching clinical trials were compiled by the patient using the TrialBridge platform for discussion with their healthcare provider.</p>
        <h2 style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '1.25rem', color: '#1C1C2E', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>Saved Clinical Trials ({finalResults.length})</h2>
        {finalResults.map((trial, index) => (
          <div key={trial.nctId} className="print-trial-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h3 className="print-trial-title">{index + 1}. {trial.title}</h3>
              <span className="nct-badge" style={{ backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.1rem 0.4rem', fontSize: '8pt', borderRadius: '4px' }}>{trial.nctId}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '8.5pt' }}>
              <span style={{ border: '1px solid #CBD5E1', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{trial.phase}</span>
              <span style={{ border: '1px solid #CBD5E1', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: '#F8FAF6' }}>{trial.status}</span>
              {trial.matchScore && <span style={{ border: '1px solid #00B894', color: '#00B894', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>{trial.matchScore}% Match</span>}
              {trial.distance !== null && <span style={{ border: '1px solid #1A6BCC', color: '#1A6BCC', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{trial.distance} miles away</span>}
            </div>
            <div className="print-meta-grid">
              <div><strong>Lead Sponsor:</strong> {trial.sponsor}</div>
              <div><strong>Primary Location:</strong> {trial.location}</div>
            </div>
            <div style={{ backgroundColor: '#F8F9FC', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid #1A6BCC', fontSize: '9.5pt', marginBottom: '0.75rem' }}>
              <strong>Eligibility Criteria Summary:</strong><br />
              <span style={{ display: 'block', marginTop: '0.25rem', lineHeight: '1.4' }}>{trial.eligibilitySummary}</span>
            </div>
            {trial.contacts && trial.contacts.length > 0 && (
              <div style={{ fontSize: '9pt', marginTop: '0.75rem' }} className="print-section-divider">
                <strong>Coordinator Contacts:</strong>
                {trial.contacts.map((c, idx) => (
                  <div key={idx} style={{ marginTop: '0.2rem', color: '#475569' }}>
                    {c.name && <span>{c.name} </span>}
                    {c.phone && <span>&bull; Phone: {c.phone} </span>}
                    {c.email && <span>&bull; Email: {c.email}</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '1rem' }} className="print-section-divider">
              <strong style={{ fontSize: '8.5pt', color: '#6B7280' }}>MY NOTES &amp; QUESTIONS FOR MY DOCTOR:</strong>
              {trial.notes ? (
                <div style={{ margin: '0.5rem 0 1rem 0', fontSize: '9.5pt', color: '#1C1C2E', backgroundColor: '#F9FAFB', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #E5E7EB', whiteSpace: 'pre-wrap' }}>{trial.notes}</div>
              ) : (
                <div style={{ fontStyle: 'italic', color: '#9CA3AF', fontSize: '9pt', marginTop: '0.25rem', marginBottom: '0.75rem' }}>No questions noted.</div>
              )}
              <strong style={{ fontSize: '8.5pt', color: '#6B7280' }}>PHYSICIAN NOTES &amp; NEXT STEPS:</strong>
              <div style={{ borderBottom: '1px dashed #CBD5E1', height: '24px', marginTop: '0.5rem' }}></div>
              <div style={{ borderBottom: '1px dashed #CBD5E1', height: '24px', marginTop: '0.5rem' }}></div>
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: '8pt', color: '#94A3B8', marginTop: '2.5rem', pageBreakInside: 'avoid' }} className="print-section-divider">
          Disclaimer: TrialBridge is a reference platform. It does not provide medical advice. Consult with a medical professional for treatment decisions.
        </div>
      </div>

    </div>
  );
};

export default ResultsPage;
