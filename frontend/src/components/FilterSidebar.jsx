import React from 'react';

/**
 * FilterSidebar — sticky filter panel.
 *
 * @param {object} props
 * @param {string[]} props.selectedPhases
 * @param {string[]} props.selectedStatuses
 * @param {string[]} props.selectedAges
 * @param {string[]} props.selectedConditions
 * @param {Function} props.onPhaseChange
 * @param {Function} props.onStatusChange
 * @param {Function} props.onAgeChange
 * @param {Function} props.onConditionChange
 * @param {Function} props.onClearAll
 */
const FilterSidebar = ({
  selectedPhases,
  selectedStatuses,
  selectedAges,
  selectedConditions,
  onPhaseChange,
  onStatusChange,
  onAgeChange,
  onConditionChange,
  onClearAll,
}) => {
  const hasActive =
    selectedPhases.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedAges.length > 0 ||
    selectedConditions.length > 0;

  return (
    <aside className="filters-panel">
      <div className="filters-header">
        <h3>Refine Filters</h3>
        {hasActive && (
          <button onClick={onClearAll} className="clear-filters-btn" id="filter-clear-all">
            Clear All
          </button>
        )}
      </div>

      {/* Phase Filter Group */}
      <div className="filter-group">
        <h4 className="filter-group-title">Trial Phase</h4>
        <div className="filter-options">
          {['Phase I', 'Phase II', 'Phase III', 'Phase IV'].map(phase => (
            <label key={phase} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedPhases.includes(phase)}
                onChange={() => onPhaseChange(phase)}
                id={`filter-phase-${phase.toLowerCase().replace(' ', '-')}`}
              />
              {phase}
            </label>
          ))}
        </div>
      </div>

      {/* Status Filter Group */}
      <div className="filter-group">
        <h4 className="filter-group-title">Status</h4>
        <div className="filter-options">
          {['Recruiting', 'Active', 'Completed', 'Enrolling by Invitation'].map(status => (
            <label key={status} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status)}
                onChange={() => onStatusChange(status)}
                id={`filter-status-${status.toLowerCase().replace(/[\s,]/g, '-')}`}
              />
              {status}
            </label>
          ))}
        </div>
      </div>

      {/* Age Group Filter Group */}
      <div className="filter-group">
        <h4 className="filter-group-title">Age Group</h4>
        <div className="filter-options">
          {['Child (0-17)', 'Adult (18-65)', 'Older Adult (66+)'].map(age => (
            <label key={age} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedAges.includes(age)}
                onChange={() => onAgeChange(age)}
                id={`filter-age-${age.toLowerCase().replace(/[\s()+]/g, '-')}`}
              />
              {age}
            </label>
          ))}
        </div>
      </div>

      {/* Condition Category Filter Group */}
      <div className="filter-group">
        <h4 className="filter-group-title">Condition Category</h4>
        <div className="filter-options">
          {[
            'Cancer & Neoplasms',
            'Cardiovascular & Heart Diseases',
            'Diabetes & Endocrine',
            'Neurology & Brain',
            'Infectious Diseases',
            'Respiratory & Lung',
            'Mental Health & Psychiatric',
          ].map(cond => (
            <label key={cond} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedConditions.includes(cond)}
                onChange={() => onConditionChange(cond)}
                id={`filter-condition-${cond.toLowerCase().split(' ')[0]}`}
              />
              {cond}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterSidebar;
