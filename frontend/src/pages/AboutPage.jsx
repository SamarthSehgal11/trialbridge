import React from 'react';

// Tech stack icons
const CodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const WarningIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const AboutPage = () => {
  return (
    <div className="about-container">
      
      {/* Header */}
      <header className="about-header">
        <h1 style={{ fontSize: '2.25rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>About TrialBridge</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
          Bridging the gap between patients, researchers, and clinical trials.
        </p>
      </header>

      {/* Mission */}
      <section className="about-mission">
        Over 80% of clinical trials fail or face severe delays due to poor enrollment. Simultaneously, patients and clinicians struggle to find ongoing, relevant clinical trials because registries are written in complex medical jargon. 
        <br /><br />
        <strong>TrialBridge</strong> resolves this communication gap by leveraging state-of-the-art semantic search models to map plain English descriptions of patient conditions directly to live study registries.
      </section>

      {/* Tech Stack */}
      <section className="about-card">
        <h3>Technical Architecture</h3>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          This application connects a modern React dashboard to a high-performance Python FastAPI matching gateway.
        </p>
        
        <div className="tech-grid">
          <div className="tech-tag">
            <CodeIcon />
            <span>Backend: <strong>FastAPI (Python)</strong></span>
          </div>
          <div className="tech-tag">
            <CodeIcon />
            <span>AI Model: <strong>Sentence-Transformers</strong></span>
          </div>
          <div className="tech-tag">
            <CodeIcon />
            <span>Model Name: <strong>all-MiniLM-L6-v2</strong></span>
          </div>
          <div className="tech-tag">
            <CodeIcon />
            <span>Frontend: <strong>React + Vite (JS)</strong></span>
          </div>
          <div className="tech-tag">
            <CodeIcon />
            <span>Database: <strong>PostgreSQL / SQLite</strong></span>
          </div>
          <div className="tech-tag">
            <CodeIcon />
            <span>Data API: <strong>ClinicalTrials.gov v2</strong></span>
          </div>
        </div>

        <h4 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>How the Semantic Matching Pipeline Works</h4>
        <ol style={{ fontSize: '0.9rem', paddingLeft: '1.25rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            The patient enters a query (e.g. <em>"type 2 diabetes adults over 50 with no prior insulin use"</em>).
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            The FastAPI backend queries the live <strong>ClinicalTrials.gov v2 API</strong> for a candidate pool of relevant studies.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            The backend computes embeddings for the user's search query and for each study description using the local <strong>Sentence-Transformers</strong> model.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            The backend calculates the cosine similarity score between the query embedding and the trial embeddings, sorting them from highest similarity to lowest.
          </li>
          <li>
            The backend caches the results to reduce API overhead and sends the structured trial data to the React frontend dashboard.
          </li>
        </ol>
      </section>

      {/* Disclaimer */}
      <section className="warning-alert">
        <WarningIcon />
        <div>
          <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#7E5109', marginBottom: '0.25rem' }}>
            Medical Advice Disclaimer
          </h4>
          <p>
            TrialBridge is a student demonstration project developed for educational purposes. It matches search queries to real clinical trials using automated algorithms, but is <strong>not a medical device, diagnosis assistant, or clinical consulting system</strong>. 
            <br /><br />
            This platform does not provide medical advice. All external clinical registries are sourced directly from ClinicalTrials.gov. Patients and users must consult with a licensed, qualified healthcare professional before enrolling in or considering any clinical trial.
          </p>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
