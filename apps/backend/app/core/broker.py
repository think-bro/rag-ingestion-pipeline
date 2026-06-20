from taskiq_redis import RedisAsyncResultBackend, RedisStreamBroker
import taskiq_litestar

result_backend = RedisAsyncResultBackend(
    redis_url="redis://redis:6379/0",
    result_ex_time=3600,
)

broker = RedisStreamBroker(
    url="redis://redis:6379/0",
).with_result_backend(result_backend)

taskiq_litestar.init(broker, "apps.backend.app.main:app")
