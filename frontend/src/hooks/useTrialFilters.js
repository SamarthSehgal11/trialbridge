import { useState } from 'react';

/**
 * Manages all filter state and filter logic extracted from ResultsPage.
 *
 * @param {Array} activeData - The full dataset to filter (search results or bookmarks).
 * @returns {{
 *   selectedPhases: string[],
 *   selectedStatuses: string[],
 *   selectedAges: string[],
 *   selectedConditions: string[],
 *   handlePhaseChange: (phase: string) => void,
 *   handleStatusChange: (status: string) => void,
 *   handleAgeChange: (age: string) => void,
 *   handleConditionChange: (condition: string) => void,
 *   clearAllFilters: () => void,
 *   filteredResults: Array,
 * }}
 */
export function useTrialFilters(activeData) {
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedAges, setSelectedAges] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);

  const handlePhaseChange = (phase) => {
    setSelectedPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  };

  const handleStatusChange = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleAgeChange = (age) => {
    setSelectedAges(prev =>
      prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]
    );
  };

  const handleConditionChange = (condition) => {
    setSelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    );
  };

  const clearAllFilters = () => {
    setSelectedPhases([]);
    setSelectedStatuses([]);
    setSelectedAges([]);
    setSelectedConditions([]);
  };

  const filteredResults = (activeData || []).filter(trial => {
    // 1. Phase Filter
    if (selectedPhases.length > 0) {
      const trialPhase = trial.phase || '';
      const matchesPhase = selectedPhases.some(p => trialPhase.toLowerCase().includes(p.toLowerCase()));
      if (!matchesPhase) return false;
    }

    // 2. Status Filter
    if (selectedStatuses.length > 0) {
      const trialStatus = trial.status || '';
      const matchesStatus = selectedStatuses.some(s => trialStatus.toLowerCase().includes(s.toLowerCase()));
      if (!matchesStatus) return false;
    }

    // 3. Age Filter
    if (selectedAges.length > 0) {
      const stdAgesLower = (trial.stdAges || []).map(a => a.toLowerCase());
      const matchesAge = selectedAges.some(ageGroup => {
        if (ageGroup.includes('Child') && stdAgesLower.includes('child')) return true;
        if (ageGroup.includes('Adult') && stdAgesLower.includes('adult')) return true;
        if (ageGroup.includes('Older Adult') && stdAgesLower.includes('older_adult')) return true;
        return false;
      });
      if (!matchesAge) return false;
    }

    // 4. Condition Category Filter
    if (selectedConditions.length > 0) {
      const condsLower = (trial.conditions || []).map(c => c.toLowerCase());
      const matchesCondition = selectedConditions.some(cFilter => {
        if (cFilter.includes('Cancer') && condsLower.some(c => c.includes('cancer') || c.includes('neoplasm') || c.includes('carcinoma') || c.includes('tumor'))) return true;
        if (cFilter.includes('Cardiovascular') && condsLower.some(c => c.includes('heart') || c.includes('cardio') || c.includes('coronary') || c.includes('stroke') || c.includes('artery'))) return true;
        if (cFilter.includes('Diabetes') && condsLower.some(c => c.includes('diabet') || c.includes('endocrine') || c.includes('thyroid') || c.includes('insulin'))) return true;
        if (cFilter.includes('Neurology') && condsLower.some(c => c.includes('neuro') || c.includes('brain') || c.includes('alzheimer') || c.includes('parkinson') || c.includes('cognitive'))) return true;
        if (cFilter.includes('Infectious') && condsLower.some(c => c.includes('infect') || c.includes('virus') || c.includes('bacteria') || c.includes('hiv') || c.includes('covid') || c.includes('influenza'))) return true;
        if (cFilter.includes('Respiratory') && condsLower.some(c => c.includes('lung') || c.includes('respir') || c.includes('asthma') || c.includes('copd') || c.includes('bronchitis'))) return true;
        if (cFilter.includes('Mental') && condsLower.some(c => c.includes('psych') || c.includes('mental') || c.includes('depress') || c.includes('anxiety') || c.includes('schiz') || c.includes('dementia'))) return true;
        return false;
      });
      if (!matchesCondition) return false;
    }

    return true;
  });

  return {
    selectedPhases,
    selectedStatuses,
    selectedAges,
    selectedConditions,
    handlePhaseChange,
    handleStatusChange,
    handleAgeChange,
    handleConditionChange,
    clearAllFilters,
    filteredResults,
  };
}
