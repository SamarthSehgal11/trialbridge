import os
import sqlite3
import logging
import re
from datetime import datetime
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trialbridge-db")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB_TYPE = "sqlite"  # Default
sqlite_db_path = os.path.join(os.path.dirname(__file__), "trialbridge.db")

# Simple check to see if PostgreSQL is available and configured
pg_conn = None
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    try:
        import psycopg2
        # Try to connect with a short timeout
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
        conn.close()
        DB_TYPE = "postgres"
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to SQLite.")
        DB_TYPE = "sqlite"
else:
    logger.info("PostgreSQL not configured. Using SQLite.")

def get_connection():
    if DB_TYPE == "postgres":
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    else:
        # Enable write-ahead logging (WAL) mode for concurrency in SQLite
        conn = sqlite3.connect(sqlite_db_path)
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        if DB_TYPE == "postgres":
            # PostgreSQL Tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS search_logs (
                    id SERIAL PRIMARY KEY,
                    query_text TEXT NOT NULL,
                    results_count INTEGER NOT NULL,
                    country TEXT,
                    city TEXT,
                    phases TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bookmarked_trials (
                    id SERIAL PRIMARY KEY,
                    session_id VARCHAR(255) NOT NULL,
                    nct_id VARCHAR(50) NOT NULL,
                    notes TEXT,
                    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(session_id, nct_id)
                );
            """)
            cursor.execute("ALTER TABLE bookmarked_trials ADD COLUMN IF NOT EXISTS notes TEXT;")
            cursor.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS country TEXT;")
            cursor.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS city TEXT;")
            cursor.execute("ALTER TABLE search_logs ADD COLUMN IF NOT EXISTS phases TEXT;")
        else:
            # SQLite Tables
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS search_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    query_text TEXT NOT NULL,
                    results_count INTEGER NOT NULL,
                    country TEXT,
                    city TEXT,
                    phases TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bookmarked_trials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    nct_id TEXT NOT NULL,
                    notes TEXT,
                    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(session_id, nct_id)
                );
            """)
            try:
                cursor.execute("ALTER TABLE bookmarked_trials ADD COLUMN notes TEXT;")
            except sqlite3.OperationalError:
                pass
            try:
                cursor.execute("ALTER TABLE search_logs ADD COLUMN country TEXT;")
            except sqlite3.OperationalError:
                pass
            try:
                cursor.execute("ALTER TABLE search_logs ADD COLUMN city TEXT;")
            except sqlite3.OperationalError:
                pass
            try:
                cursor.execute("ALTER TABLE search_logs ADD COLUMN phases TEXT;")
            except sqlite3.OperationalError:
                pass
        conn.commit()
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database tables: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

COUNTRY_NAME_TO_CODE = {
    "united states": "US",
    "united states of america": "US",
    "canada": "CA",
    "united kingdom": "GB",
    "germany": "DE",
    "france": "FR",
    "south korea": "KR",
    "japan": "JP",
    "australia": "AU",
    "singapore": "SG",
    "india": "IN",
    "china": "CN",
    "brazil": "BR",
    "south africa": "ZA",
    "italy": "IT",
    "spain": "ES",
    "netherlands": "NL",
    "switzerland": "CH",
    "sweden": "SE",
    "norway": "NO",
    "denmark": "DK",
    "finland": "FI",
    "russia": "RU",
    "mexico": "MX",
    "new zealand": "NZ"
}

def get_country_code(country_str: str) -> str:
    if not country_str or country_str == "Unknown":
        return "Unknown"
    c_clean = country_str.strip().lower()
    if len(c_clean) == 2:
        return c_clean.upper()
    return COUNTRY_NAME_TO_CODE.get(c_clean, country_str.strip()[:2].upper())

def sanitize_query(q: str) -> str:
    if not q:
        return ""
    if '&' in q:
        q = q.split('&')[0]
    q = q.strip().lower()
    q = re.sub(r'\s+', ' ', q)
    return q

def log_search(query_text: str, results_count: int, ip: str = None, phases: str = None):
    try:
        import requests
        
        # 1. Sanitize query
        if not query_text:
            return
        query_text = sanitize_query(query_text)
        if not query_text:
            return
            
        # 2. Sequence check for exact sequence duplicates to deduplicate near-identical queries
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT query_text FROM search_logs ORDER BY id DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                last_query = row[0] if DB_TYPE == "postgres" else row['query_text']
                if last_query and sanitize_query(last_query) == query_text:
                    logger.info(f"Skipping sequence duplicate log for query: '{query_text}'")
                    cursor.close()
                    conn.close()
                    return
            cursor.close()
            conn.close()
        except Exception as de_err:
            logger.warning(f"Failed to check duplicate log: {de_err}")

        # 3. Geolocation
        country = "Unknown"
        city = "Unknown"
        
        clean_ip = ip
        if ip:
            if ip == "::1" or ip == "127.0.0.1":
                clean_ip = ""
            elif ip.startswith("::ffff:"):
                clean_ip = ip.replace("::ffff:", "")
            
        if clean_ip and clean_ip not in ("127.0.0.1", "::1", "localhost", "172.18.0.1"):
            try:
                res = requests.get(f"https://ipapi.co/{clean_ip}/json/", headers={"User-Agent": "Mozilla/5.0"}, timeout=2)
                if res.status_code == 200:
                    geo = res.json()
                    country = geo.get("country", geo.get("country_name", "Unknown"))
                    city = geo.get("city", "Unknown")
            except Exception as e:
                logger.error(f"IP Geolocation query failed: {e}")
        else:
            try:
                res = requests.get("https://ipapi.co/json/", headers={"User-Agent": "Mozilla/5.0"}, timeout=2)
                if res.status_code == 200:
                    geo = res.json()
                    country = geo.get("country", geo.get("country_name", "Unknown"))
                    city = geo.get("city", "Unknown")
            except Exception as e:
                pass

        conn = get_connection()
        cursor = conn.cursor()
        if DB_TYPE == "postgres":
            cursor.execute(
                "INSERT INTO search_logs (query_text, results_count, country, city, phases) VALUES (%s, %s, %s, %s, %s)",
                (query_text, results_count, country, city, phases)
            )
        else:
            cursor.execute(
                "INSERT INTO search_logs (query_text, results_count, country, city, phases) VALUES (?, ?, ?, ?, ?)",
                (query_text, results_count, country, city, phases)
            )
        conn.commit()
        cursor.close()
        conn.close()
        logger.info(f"Logged search query: '{query_text}' from {city}, {country} with {results_count} results.")
    except Exception as e:
        logger.error(f"Failed to log search query: {e}")

def get_analytics_summary():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Total searches
        cursor.execute("SELECT COUNT(*) FROM search_logs")
        total_searches = cursor.fetchone()[0]
        
        # 2. Unique conditions
        cursor.execute("SELECT COUNT(DISTINCT query_text) FROM search_logs")
        unique_conditions = cursor.fetchone()[0]
        
        # 3. Most active day
        if DB_TYPE == "postgres":
            cursor.execute("""
                SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as day, COUNT(*) as count 
                FROM search_logs 
                GROUP BY day 
                ORDER BY count DESC 
                LIMIT 1
            """)
        else:
            cursor.execute("""
                SELECT strftime('%Y-%m-%d', timestamp) as day, COUNT(*) as count 
                FROM search_logs 
                GROUP BY day 
                ORDER BY count DESC 
                LIMIT 1
            """)
        row = cursor.fetchone()
        most_active_day = None
        if row:
            most_active_day = row[0] if DB_TYPE == "postgres" else row['day']

        # 4. Top searched conditions (sanitize on read to ensure url query params are stripped and merged)
        cursor.execute("SELECT query_text, COUNT(*) as count FROM search_logs GROUP BY query_text")
        rows = cursor.fetchall()
        condition_counts = {}
        for r in rows:
            q_text = r[0] if DB_TYPE == "postgres" else r['query_text']
            c_count = r[1] if DB_TYPE == "postgres" else r['count']
            if q_text:
                clean_q = sanitize_query(q_text)
                if clean_q:
                    condition_counts[clean_q] = condition_counts.get(clean_q, 0) + c_count
        
        top_conditions = [{"condition": k, "count": v} for k, v in condition_counts.items()]
        top_conditions.sort(key=lambda x: -x["count"])
        top_conditions = top_conditions[:10]

        # 5. Geographic distribution (country code, e.g. US)
        cursor.execute("""
            SELECT country, COUNT(*) as count 
            FROM search_logs 
            WHERE country IS NOT NULL AND country != 'Unknown' AND country != ''
            GROUP BY country
        """)
        geo_rows = cursor.fetchall()
        geo_counts = {}
        for r in geo_rows:
            country_val = r[0] if DB_TYPE == "postgres" else r['country']
            count_val = r[1] if DB_TYPE == "postgres" else r['count']
            if country_val:
                code = get_country_code(country_val)
                if code and code != "Unknown":
                    geo_counts[code] = geo_counts.get(code, 0) + count_val
        
        geo_distribution = [{"country": k, "count": v} for k, v in geo_counts.items()]
        geo_distribution.sort(key=lambda x: -x["count"])

        # 6. Trial phase distribution
        cursor.execute("SELECT phases FROM search_logs WHERE phases IS NOT NULL")
        phase_rows = cursor.fetchall()
        
        phase_counts = {
            "Phase I": 0,
            "Phase II": 0,
            "Phase III": 0,
            "Phase IV": 0,
            "N/A": 0
        }
        for r in phase_rows:
            phases_str = r[0] if DB_TYPE == "postgres" else r['phases']
            if phases_str:
                for phase in phases_str.split(","):
                    p = phase.strip()
                    if p in phase_counts:
                        phase_counts[p] += 1
                    elif "Phase I/II" in p or "Phase I" in p:
                        phase_counts["Phase I"] += 1
                    elif "Phase II/III" in p or "Phase II" in p:
                        phase_counts["Phase II"] += 1
                    elif "Phase III" in p:
                        phase_counts["Phase III"] += 1
                    elif "Phase IV" in p:
                        phase_counts["Phase IV"] += 1
                    else:
                        phase_counts["N/A"] += 1
        
        phase_distribution = [{"phase": k, "count": v} for k, v in phase_counts.items()]
        
        cursor.close()
        conn.close()
        
        return {
            "top_conditions": top_conditions,
            "geo_distribution": geo_distribution,
            "phase_distribution": phase_distribution,
            "total_searches": total_searches,
            "unique_conditions": unique_conditions,
            "most_active_day": most_active_day
        }
    except Exception as e:
        logger.error(f"Failed to get analytics summary: {e}")
        return {
            "top_conditions": [],
            "geo_distribution": [],
            "phase_distribution": [],
            "total_searches": 0,
            "unique_conditions": 0,
            "most_active_day": None
        }

def add_bookmark(session_id: str, nct_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if DB_TYPE == "postgres":
            cursor.execute(
                "INSERT INTO bookmarked_trials (session_id, nct_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (session_id, nct_id)
            )
        else:
            cursor.execute(
                "INSERT OR IGNORE INTO bookmarked_trials (session_id, nct_id) VALUES (?, ?)",
                (session_id, nct_id)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to add bookmark: {e}")
        return False

def remove_bookmark(session_id: str, nct_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if DB_TYPE == "postgres":
            cursor.execute(
                "DELETE FROM bookmarked_trials WHERE session_id = %s AND nct_id = %s",
                (session_id, nct_id)
            )
        else:
            cursor.execute(
                "DELETE FROM bookmarked_trials WHERE session_id = ? AND nct_id = ?",
                (session_id, nct_id)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to remove bookmark: {e}")
        return False

def get_bookmarks(session_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if DB_TYPE == "postgres":
            cursor.execute(
                "SELECT nct_id, notes FROM bookmarked_trials WHERE session_id = %s",
                (session_id,)
            )
        else:
            cursor.execute(
                "SELECT nct_id, notes FROM bookmarked_trials WHERE session_id = ?",
                (session_id,)
            )
        rows = cursor.fetchall()
        bookmarks = {}
        for row in rows:
            if DB_TYPE == "postgres":
                bookmarks[row[0]] = row[1]
            else:
                bookmarks[row['nct_id']] = row['notes']
        cursor.close()
        conn.close()
        return bookmarks
    except Exception as e:
        logger.error(f"Failed to get bookmarks: {e}")
        return {}

def update_bookmark_notes(session_id: str, nct_id: str, notes: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        if DB_TYPE == "postgres":
            cursor.execute(
                "UPDATE bookmarked_trials SET notes = %s WHERE session_id = %s AND nct_id = %s",
                (notes, session_id, nct_id)
            )
        else:
            cursor.execute(
                "UPDATE bookmarked_trials SET notes = ? WHERE session_id = ? AND nct_id = ?",
                (notes, session_id, nct_id)
            )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to update bookmark notes: {e}")
        return False

# Initialize DB on load
init_db()
