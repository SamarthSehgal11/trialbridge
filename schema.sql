-- TrialBridge Database Schema (PostgreSQL DDL)
-- This file defines the tables used for search logging and session-based bookmarks.

-- Table: search_logs
-- Captures anonymized, aggregate telemetry of what users search for and count of results returned.
CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    query_text TEXT NOT NULL,
    results_count INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for optimizing search term analysis queries
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query_text);

-- Table: bookmarked_trials
-- Manages session-based saved clinical trials for patients/researchers.
CREATE TABLE IF NOT EXISTS bookmarked_trials (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    nct_id VARCHAR(50) NOT NULL,
    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, nct_id)
);

-- Index for quick lookups of bookmarks by session ID
CREATE INDEX IF NOT EXISTS idx_bookmarked_trials_session ON bookmarked_trials(session_id);

-- Optional: pgvector Integration Schema
-- Used for high-scale local semantic vector matching inside PostgreSQL.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS trials_vector_store (
    nct_id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    sponsor VARCHAR(255),
    phase VARCHAR(50),
    status VARCHAR(50),
    location TEXT,
    eligibility_criteria TEXT,
    embedding vector(384), -- 384 dimensions matches all-MiniLM-L6-v2
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a Hierarchical Navigable Small World (HNSW) index for sub-millisecond semantic search
CREATE INDEX IF NOT EXISTS idx_trials_vector_hnsw ON trials_vector_store USING hnsw (embedding vector_cosine_ops);

