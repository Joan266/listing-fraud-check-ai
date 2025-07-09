# worker.py
import redis
from rq import Connection, Worker, Queue
from app.core.config import settings

listen = ['default']

redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
print(f"Connecting worker to Redis at {redis_url}")

conn = redis.from_url(redis_url)

if __name__ == '__main__':
    with Connection(conn):
        worker = Worker(list(map(Queue, listen)))
        print(f"Worker starting... Listening on queues: {', '.join(listen)}")
        worker.work()