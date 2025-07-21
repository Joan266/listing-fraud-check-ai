# analysis_worker.py
import redis
from rq import Worker, Queue
from app.core.config import settings

listen = ['analysis-fast', 'analysis-heavy']

redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
print(f"Connecting ANALYSIS worker to Redis at {redis_url}")

conn = redis.from_url(redis_url)

if __name__ == '__main__':
    queues = [Queue(name, connection=conn) for name in listen]
    worker = Worker(queues, connection=conn)
    
    print(f"Analysis worker starting... Listening on queues (in order): {', '.join(listen)}")
    worker.work()