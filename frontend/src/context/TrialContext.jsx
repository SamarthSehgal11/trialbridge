import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const TrialContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const TrialProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [screeningParams, setScreeningParams] = useState(null);

  // Initialize Session ID
  useEffect(() => {
    let id = localStorage.getItem('trialbridge_session_id');
    if (!id) {
      id = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('trialbridge_session_id', id);
    }
    setSessionId(id);
  }, []);

  // Fetch Bookmarks from Backend once Session ID is loaded
  useEffect(() => {
    if (!sessionId) return;

    const fetchBookmarks = async () => {
      try {
        const response = await axios.get(`${API_BASE}/bookmarks`, {
          params: { session_id: sessionId }
        });
        setBookmarks(response.data);
      } catch (err) {
        console.error('Failed to fetch bookmarks:', err);
      }
    };

    fetchBookmarks();
  }, [sessionId]);

  // Execute Semantic Search
  const executeSearch = async (queryText, forceParams = null) => {
    if (!queryText || !queryText.trim()) return;
    
    setIsLoading(true);
    setSearchError(null);
    setSearchQuery(queryText);

    // Merge parameters
    const activeParams = forceParams !== null ? forceParams : screeningParams;

    try {
      const params = { query: queryText };
      if (activeParams) {
        if (activeParams.age !== undefined && activeParams.age !== null && activeParams.age !== '') {
          params.age = activeParams.age;
        }
        if (activeParams.gender) {
          params.gender = activeParams.gender;
        }
        if (activeParams.prior_treatments) {
          params.prior_treatments = activeParams.prior_treatments;
        }
        if (activeParams.current_meds) {
          params.current_meds = activeParams.current_meds;
        }
        if (activeParams.healthy !== undefined && activeParams.healthy !== null) {
          params.healthy = activeParams.healthy;
        }
        if (activeParams.metastasis !== undefined && activeParams.metastasis !== null) {
          params.metastasis = activeParams.metastasis;
        }
      }

      const response = await axios.get(`${API_BASE}/search`, { params });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError(
        err.response?.data?.detail || 
        'Could not connect to the search server. Please check if the backend is running.'
      );
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Bookmark state on Backend & Local
  const toggleBookmark = async (trial) => {
    if (!sessionId || !trial) return;

    const isBookmarked = bookmarks.some(b => b.nctId === trial.nctId);

    try {
      if (isBookmarked) {
        // Delete bookmark
        await axios.delete(`${API_BASE}/bookmarks`, {
          data: { session_id: sessionId, nct_id: trial.nctId }
        });
        setBookmarks(prev => prev.filter(b => b.nctId !== trial.nctId));
      } else {
        // Add bookmark
        await axios.post(`${API_BASE}/bookmarks`, {
          session_id: sessionId,
          nct_id: trial.nctId
        });
        setBookmarks(prev => [...prev, { ...trial, notes: '' }]);
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  // Update bookmark notes on Backend & Local
  const updateBookmarkNotes = async (nctId, notes) => {
    if (!sessionId || !nctId) return;

    try {
      await axios.put(`${API_BASE}/bookmarks/notes`, {
        session_id: sessionId,
        nct_id: nctId,
        notes: notes
      });
      setBookmarks(prev => prev.map(b => b.nctId === nctId ? { ...b, notes } : b));
    } catch (err) {
      console.error('Error updating bookmark notes:', err);
    }
  };

  return (
    <TrialContext.Provider value={{
      searchQuery,
      setSearchQuery,
      searchResults,
      setSearchResults,
      isLoading,
      setIsLoading,
      searchError,
      setSearchError,
      bookmarks,
      toggleBookmark,
      updateBookmarkNotes,
      executeSearch,
      sessionId,
      screeningParams,
      setScreeningParams
    }}>
      {children}
    </TrialContext.Provider>
  );
};

export const useTrial = () => {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrial must be used within a TrialProvider');
  }
  return context;
};
