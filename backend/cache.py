import time
import threading
import logging
from config import settings

logger = logging.getLogger("trialbridge-cache")

cache: dict = {}
cache_lock = threading.Lock()


def get_cached_data(key: str):
    with cache_lock:
        if key in cache:
            timestamp, data = cache[key]
            if time.time() - timestamp < settings.cache_ttl:
                logger.info(f"Cache HIT for key: {key}")
                return data
            else:
                logger.info(f"Cache EXPIRED for key: {key}")
                del cache[key]
        return None


def set_cached_data(key: str, data) -> None:
    with cache_lock:
        cache[key] = (time.time(), data)
        logger.info(f"Cache SET for key: {key}")
