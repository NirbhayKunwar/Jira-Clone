import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("jira_fastapi")

def get_database() -> AsyncIOMotorDatabase:
    client = AsyncIOMotorClient(settings.DATABASE_URL)
    return client.get_database(settings.DATABASE_NAME)

async def connect_to_mongo():
    logger.info("[DATABASE] Connecting to MongoDB Atlas...")
    db = get_database()
    logger.info(f"[DATABASE] Connected to MongoDB Atlas database: {db.name}")
    await init_indexes(db)

async def close_mongo_connection():
    pass

async def init_indexes(db: AsyncIOMotorDatabase):
    try:
        await db["users"].create_index("email", unique=True)
        await db["users"].create_index("google_id", sparse=True)
        await db["workspaces"].create_index("key", unique=True)
        await db["tasks"].create_index([("workspace_id", 1), ("status", 1), ("priority", 1)])
        await db["tasks"].create_index([("workspace_id", 1), ("assignee_id", 1)])
        await db["tasks"].create_index([("workspace_id", 1), ("created_at", -1)])
        await db["notifications"].create_index([("workspace_id", 1), ("created_at", -1)])
        await db["audit_logs"].create_index([("resource_id", 1), ("created_at", -1)])
        await db["auth_tokens"].create_index("expires_at", expireAfterSeconds=0)
        await db["idempotency_keys"].create_index("expires_at", expireAfterSeconds=0)
        await db["idempotency_keys"].create_index("key", unique=True)
        await db["permissions"].create_index("name", unique=True)
    except Exception as e:
        logger.error(f"[DATABASE] Error initializing indexes: {e}")
