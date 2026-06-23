import redis.asyncio as aioredis

from apps.backend.app.core.config import REDIS_URL


async def get_redis_pool() -> aioredis.ConnectionPool:
    """Creates and returns a connection pool for Redis."""
    return aioredis.ConnectionPool.from_url(
        REDIS_URL,
        max_connections=20,
        decode_responses=True,
    )
