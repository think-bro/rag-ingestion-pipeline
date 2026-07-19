from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker
import taskiq_litestar

from apps.backend.app.core.config import settings as core_settings

result_backend = RedisAsyncResultBackend(
    redis_url=core_settings.redis_url,
    result_ex_time=3600,
)

broker = RedisStreamBroker(
    url=core_settings.redis_url,
    idle_timeout=7_200_000,
    xread_count=1,
).with_result_backend(result_backend)

taskiq_litestar.init(broker, "apps.backend.app.main:app")
