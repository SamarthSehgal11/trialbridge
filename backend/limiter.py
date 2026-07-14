from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate-limiter instance.
# Import this in main.py (to attach to app.state) and in any route
# module that applies @limiter.limit() decorators.
limiter = Limiter(key_func=get_remote_address)
