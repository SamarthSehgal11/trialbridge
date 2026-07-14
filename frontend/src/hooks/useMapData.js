import { useState, useEffect } from 'react';

/**
 * Haversine distance calculator (miles).
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null}
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Manages user geolocation, distance calculation, and result sorting.
 *
 * @param {Array} filteredResults - Results already filtered by useTrialFilters.
 * @param {boolean} isBookmarkView - Whether we're in bookmark mode.
 * @returns {{
 *   userCoords: {latitude: number, longitude: number}|null,
 *   sortBy: string,
 *   setSortBy: Function,
 *   finalResults: Array,
 * }}
 */
export function useMapData(filteredResults, isBookmarkView) {
  const [userCoords, setUserCoords] = useState(null);
  const [sortBy, setSortBy] = useState('match');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation permission denied or coordinates unavailable:', error);
        }
      );
    }
  }, []);

  // Augment with distance
  const withDistance = (filteredResults || []).map(trial => {
    let distance = null;
    if (userCoords && trial.latitude != null && trial.longitude != null) {
      distance = calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        trial.latitude,
        trial.longitude
      );
    }
    return { ...trial, distance };
  });

  // Sort
  const finalResults = [...withDistance];
  if (sortBy === 'distance' && userCoords) {
    finalResults.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  } else {
    finalResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  return { userCoords, sortBy, setSortBy, finalResults };
}
