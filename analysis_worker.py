# analysis_worker.py
import logging
import platform
import redis
from rq import Queue
from rq.worker import SimpleWorker, Worker
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("worker.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger(__name__)

listen = ['analysis-fast', 'analysis-heavy']

redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
logger.info(f"Connecting ANALYSIS worker to Redis at {redis_url}")

conn = redis.from_url(redis_url)

if __name__ == '__main__':
    queues = [Queue(name, connection=conn) for name in listen]
    WorkerClass = SimpleWorker if platform.system() == "Windows" else Worker
    worker = WorkerClass(queues, connection=conn)

    logger.info(f"Analysis worker starting... Listening on queues (in order): {', '.join(listen)}")
    worker.work()