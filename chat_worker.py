# chat_worker.py
import redis
from rq import Worker, Queue
from app.core.config import settings

listen = ['chats']

redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
print(f"Connecting CHAT worker to Redis at {redis_url}")

conn = redis.from_url(redis_url)

if __name__ == '__main__':
    queues = [Queue(name, connection=conn) for name in listen]
    worker = Worker(queues, connection=conn)
    
    print(f"Chat worker starting... Listening on queue: {listen[0]}")
    worker.work()