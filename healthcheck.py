# healthcheck.py
import os
import socket
import sys

redis_host = os.environ.get('REDIS_HOST', 'localhost')
redis_port = int(os.environ.get('REDIS_PORT', 6379))

try:
    s = socket.create_connection((redis_host, redis_port), timeout=5)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
    
    
