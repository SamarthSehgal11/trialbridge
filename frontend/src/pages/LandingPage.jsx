import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTrial } from '../context/TrialContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Simple search SVG
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// Stat icons
const DocumentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const LandingPage = () => {
  const { searchQuery, executeSearch } = useTrial();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Dynamic Date string
  const [todayDate, setTodayDate] = useState('');

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Auto-focus search input on load
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Set formatted dynamic date
    const formatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setTodayDate(formatted);

    // Load search history
    const history = JSON.parse(localStorage.getItem('trialbridge_search_history') || '[]');
    setSearchHistory(history);
  }, []);

  // Autocomplete fetcher with debounce
  useEffect(() => {
    if (!localQuery || !localQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_BASE}/autocomplete`, {
          params: { q: localQuery }
        });
        setSuggestions(response.data);
      } catch (err) {
        console.error("Autocomplete fetch error:", err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [localQuery]);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (localQuery && localQuery.trim()) {
      saveSearchToHistory(localQuery);
      executeSearch(localQuery.trim());
      navigate('/results');
    }
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Find a clinical trial that <span>fits your life</span>.
        </h1>
        <p className="hero-subheading">
          Describe your condition in plain English. We match you to active trials using AI.
        </p>

        {/* Search Box */}
        <form onSubmit={handleSearchSubmit} className="search-container">
          <div 
            ref={autocompleteRef}
            className="search-input-wrapper"
            style={{ position: 'relative' }}
          >
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              id="trial-search-input"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="e.g. Type 2 diabetes in adults over 50 with no prior insulin use"
              aria-label="Search clinical trials by condition, treatments, or location"
              autoComplete="off"
            />
            <button type="submit" className="search-button" id="trial-search-submit">
              Search Trials
            </button>
            {showSuggestions && (
              (localQuery && suggestions.length > 0) ? (
                <ul className="autocomplete-dropdown glass-panel" style={{ width: 'calc(100% - 140px)' }} id="landing-autocomplete-dropdown">
                  {suggestions.map((sug, idx) => (
                    <li 
                      key={idx}
                      className="autocomplete-item"
                      onClick={() => {
                        setLocalQuery(sug);
                        setShowSuggestions(false);
                        saveSearchToHistory(sug);
                        executeSearch(sug);
                        navigate('/results');
                      }}
                    >
                      {sug}
                    </li>
                  ))}
                </ul>
              ) : (!localQuery && searchHistory.length > 0) ? (
                <ul className="autocomplete-dropdown glass-panel" style={{ width: 'calc(100% - 140px)' }} id="landing-history-dropdown">
                  <li className="autocomplete-header" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchHistory([]);
                        localStorage.removeItem('trialbridge_search_history');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-color)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      Clear All
                    </button>
                  </li>
                  {searchHistory.map((hist, idx) => (
                    <li 
                      key={idx}
                      className="autocomplete-item"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => {
                        setLocalQuery(hist);
                        setShowSuggestions(false);
                        saveSearchToHistory(hist);
                        executeSearch(hist);
                        navigate('/results');
                      }}
                    >
                      <span>{hist}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHistory = searchHistory.filter((_, i) => i !== idx);
                          setSearchHistory(newHistory);
                          localStorage.setItem('trialbridge_search_history', JSON.stringify(newHistory));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9CA3AF',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          padding: '0 0.5rem',
                          lineHeight: 1
                        }}
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null
            )}
          </div>
        </form>
      </section>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <DocumentIcon />
          </div>
          <div className="stat-info">
            <span className="stat-number">40,000+</span>
            <span className="stat-label">Active Trials</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <GlobeIcon />
          </div>
          <div className="stat-info">
            <span className="stat-number">180+</span>
            <span className="stat-label">Countries</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <CalendarIcon />
          </div>
          <div className="stat-info">
            <span className="stat-number">{todayDate || "Updated Daily"}</span>
            <span className="stat-label">From ClinicalTrials.gov</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works-section">
        <h2 className="section-title">How It Works</h2>
        <div className="timeline-container">
          <div className="timeline-step">
            <div className="step-number">1</div>
            <h3 className="step-title">Describe</h3>
            <p className="step-desc">
              Type your diagnosis, age, or treatment history in plain language.
            </p>
          </div>
          <div className="timeline-step">
            <div className="step-number">2</div>
            <h3 className="step-title">Match</h3>
            <p className="step-desc">
              Our semantic search model maps your description to trial protocols.
            </p>
          </div>
          <div className="timeline-step">
            <div className="step-number">3</div>
            <h3 className="step-title">Explore</h3>
            <p className="step-desc">
              Filter results by phase, status, and study requirements to find fits.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
