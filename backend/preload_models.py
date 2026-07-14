import logging
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("preload-models")

def main():
    logger.info("Pre-downloading Bi-Encoder model 'all-MiniLM-L6-v2'...")
    # This will trigger download and save it to the default cache directory
    model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("Bi-Encoder model preloaded successfully.")

if __name__ == "__main__":
    main()
