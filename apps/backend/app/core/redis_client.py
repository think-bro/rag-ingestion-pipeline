import redis.asyncio as aioredis

from apps.backend.app.core.config import settings as core_settings


async def get_redis_pool() -> aioredis.ConnectionPool:
    """Creates and returns a connection pool for Redis."""
    return aioredis.ConnectionPool.from_url(
        core_settings.redis_url,
        max_connections=20,
        decode_responses=True,
    )
