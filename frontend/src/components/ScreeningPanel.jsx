import React, { useState } from 'react';

/**
 * ScreeningPanel — 5-step eligibility screener modal.
 * All screener step state is managed internally; onSubmit is called
 * with the final params object when the user clicks "Analyze My Eligibility".
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onSubmit  — called with (params) object
 */
const ScreeningPanel = ({ isOpen, onClose, onSubmit }) => {
  const [screenerStep, setScreenerStep] = useState(1);
  const [screenerAge, setScreenerAge] = useState('');
  const [screenerGender, setScreenerGender] = useState('ALL');
  const [screenerHealthy, setScreenerHealthy] = useState(false);
  const [screenerMetastasis, setScreenerMetastasis] = useState(false);
  const [screenerPriorTreatments, setScreenerPriorTreatments] = useState('');
  const [screenerCurrentMeds, setScreenerCurrentMeds] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const params = {
      age: screenerAge ? parseInt(screenerAge) : null,
      gender: screenerGender,
      healthy: screenerHealthy,
      metastasis: !screenerHealthy ? screenerMetastasis : false,
      prior_treatments: screenerPriorTreatments.trim() || null,
      current_meds: screenerCurrentMeds.trim() || null,
    };
    onSubmit(params);
    onClose();
  };

  return (
    <div className="screener-modal-overlay">
      <div className="screener-modal-content glass-panel animate-scale-in">
        <button className="screener-close-btn" onClick={onClose}>&times;</button>

        <div className="screener-header">
          <h3>🧬 Personal Eligibility Screener</h3>
          <p className="screener-subtitle">Step {screenerStep} of 5</p>
          <div className="screener-progress-bar">
            <div className="screener-progress-fill" style={{ width: `${(screenerStep / 5) * 100}%` }} />
          </div>
        </div>

        <div className="screener-body">
          {/* Step 1 — Age & Gender */}
          {screenerStep === 1 && (
            <div className="screener-step-content">
              <h4>What is your age and gender?</h4>
              <p className="step-desc">This matches age restrictions and gender eligibility in trial criteria.</p>

              <div className="screener-field">
                <label htmlFor="screener-age">Age (Years)</label>
                <input
                  type="number" id="screener-age"
                  value={screenerAge} onChange={(e) => setScreenerAge(e.target.value)}
                  placeholder="e.g. 45" min="0" max="120"
                />
              </div>

              <div className="screener-field">
                <label>Gender Assigned at Birth</label>
                <div className="screener-radio-group">
                  {['FEMALE', 'MALE', 'ALL'].map((g) => (
                    <button
                      key={g} type="button"
                      className={`screener-choice-btn ${screenerGender === g ? 'active' : ''}`}
                      onClick={() => setScreenerGender(g)}
                    >
                      {g === 'ALL' ? 'All / Other' : g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Diagnosis & Volunteer */}
          {screenerStep === 2 && (
            <div className="screener-step-content">
              <h4>Diagnosis &amp; Volunteer Status</h4>

              <div className="screener-field">
                <label>Are you seeking trials as a healthy volunteer?</label>
                <div className="screener-radio-group">
                  <button
                    type="button"
                    className={`screener-choice-btn ${screenerHealthy ? 'active' : ''}`}
                    onClick={() => { setScreenerHealthy(true); setScreenerMetastasis(false); }}
                  >
                    Yes, I am a healthy volunteer
                  </button>
                  <button
                    type="button"
                    className={`screener-choice-btn ${!screenerHealthy ? 'active' : ''}`}
                    onClick={() => setScreenerHealthy(false)}
                  >
                    No, I am diagnosed with the condition
                  </button>
                </div>
              </div>

              {!screenerHealthy && (
                <div className="screener-field animate-fade-in">
                  <label>Has your condition spread or metastasized?</label>
                  <div className="screener-radio-group">
                    <button
                      type="button"
                      className={`screener-choice-btn ${screenerMetastasis ? 'active' : ''}`}
                      onClick={() => setScreenerMetastasis(true)}
                    >
                      Yes (Metastatic disease)
                    </button>
                    <button
                      type="button"
                      className={`screener-choice-btn ${!screenerMetastasis ? 'active' : ''}`}
                      onClick={() => setScreenerMetastasis(false)}
                    >
                      No / Unknown (Localized disease)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Prior Treatments */}
          {screenerStep === 3 && (
            <div className="screener-step-content">
              <h4>Prior Medical Treatments</h4>
              <p className="step-desc">List any major prior treatments (e.g. Chemotherapy, Radiotherapy, Surgery) separated by commas, or leave blank if none.</p>

              <div className="screener-field">
                <label htmlFor="screener-prior">Prior Treatments</label>
                <input
                  type="text" id="screener-prior"
                  value={screenerPriorTreatments} onChange={(e) => setScreenerPriorTreatments(e.target.value)}
                  placeholder="e.g. chemotherapy, immunotherapy"
                />
              </div>

              <div className="screener-suggestions">
                <span className="suggestion-label">Common tags:</span>
                {['chemotherapy', 'radiotherapy', 'immunotherapy', 'surgery'].map((tag) => (
                  <button
                    key={tag} type="button" className="screener-tag-suggestion"
                    onClick={() => {
                      const current = screenerPriorTreatments
                        ? screenerPriorTreatments.split(',').map(s => s.trim())
                        : [];
                      if (!current.includes(tag)) {
                        setScreenerPriorTreatments([...current, tag].join(', '));
                      }
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Current Medications */}
          {screenerStep === 4 && (
            <div className="screener-step-content">
              <h4>Current Medications</h4>
              <p className="step-desc">List any current medications or drugs you are taking separated by commas, or leave blank if none.</p>

              <div className="screener-field">
                <label htmlFor="screener-meds">Current Medications</label>
                <input
                  type="text" id="screener-meds"
                  value={screenerCurrentMeds} onChange={(e) => setScreenerCurrentMeds(e.target.value)}
                  placeholder="e.g. metformin, pembrolizumab"
                />
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {screenerStep === 5 && (
            <div className="screener-step-content">
              <h4>Review Profile Information</h4>
              <p className="step-desc">Ensure your information is correct before screening.</p>

              <div className="screener-summary-table">
                <div className="summary-row">
                  <span>Age:</span>
                  <strong>{screenerAge || 'Not specified'} years</strong>
                </div>
                <div className="summary-row">
                  <span>Gender:</span>
                  <strong>{screenerGender}</strong>
                </div>
                <div className="summary-row">
                  <span>Status:</span>
                  <strong>{screenerHealthy ? 'Healthy Volunteer' : 'Seeking Treatment'}</strong>
                </div>
                {!screenerHealthy && (
                  <div className="summary-row">
                    <span>Metastasis:</span>
                    <strong>{screenerMetastasis ? 'Yes (Metastatic)' : 'No (Localized)'}</strong>
                  </div>
                )}
                <div className="summary-row">
                  <span>Prior Treatments:</span>
                  <strong>{screenerPriorTreatments || 'None'}</strong>
                </div>
                <div className="summary-row">
                  <span>Current Medications:</span>
                  <strong>{screenerCurrentMeds || 'None'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="screener-footer">
          {screenerStep > 1 ? (
            <button type="button" className="screener-back-btn" onClick={() => setScreenerStep(prev => prev - 1)}>
              Back
            </button>
          ) : <div />}

          {screenerStep < 5 ? (
            <button
              type="button" className="screener-next-btn"
              onClick={() => setScreenerStep(prev => prev + 1)}
              disabled={screenerStep === 1 && !screenerAge}
            >
              Next
            </button>
          ) : (
            <button type="button" className="screener-submit-btn" onClick={handleSubmit}>
              Analyze My Eligibility
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScreeningPanel;
