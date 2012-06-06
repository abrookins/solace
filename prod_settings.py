import urlparse
import os

redis_url = urlparse.urlparse(
    os.environ.get('REDISTOGO_URL', 'redis://localhost:6379'))

DEBUG = True
CACHE_TYPE = 'redis'
CACHE_REDIS_HOST = redis_url.hostname
CACHE_REDIS_PORT = redis_url.port
if redis_url.password:
    CACHE_REDIS_PASSWORD = redis_url.password
