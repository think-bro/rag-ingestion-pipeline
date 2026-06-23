from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker
import taskiq_litestar

from apps.backend.app.core.config import REDIS_URL

result_backend = RedisAsyncResultBackend(
    redis_url=REDIS_URL,
    result_ex_time=3600,
)

broker = RedisStreamBroker(
    url=REDIS_URL,
).with_result_backend(result_backend)

taskiq_litestar.init(broker, "apps.backend.app.main:app")
