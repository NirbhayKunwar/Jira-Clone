import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import OperationFailure
from app.core.config import settings

logger = logging.getLogger("jira_fastapi")

def get_database() -> AsyncIOMotorDatabase:
    kwargs = {}
    if "mongodb+srv" in settings.DATABASE_URL or "ssl=true" in settings.DATABASE_URL.lower() or "tls=true" in settings.DATABASE_URL.lower():
        kwargs["tls"] = True
        kwargs["tlsAllowInvalidCertificates"] = True
    client = AsyncIOMotorClient(settings.DATABASE_URL, **kwargs)
    return client.get_database(settings.DATABASE_NAME)

async def connect_to_mongo():
    logger.info("[DATABASE] Connecting to MongoDB Atlas...")
    db = get_database()
    logger.info(f"[DATABASE] Connected to MongoDB Atlas database: {db.name}")
    await init_indexes(db)

async def close_mongo_connection():
    pass

async def _safe_create_index(collection, keys, **kwargs):
    try:
        await collection.create_index(keys, **kwargs)
    except OperationFailure as e:
        if e.code == 85: # IndexOptionsConflict (index exists with different name from Prisma)
            logger.info(f"[DATABASE] Index on {collection.name} already exists under ORM schema name.")
        else:
            logger.warning(f"[DATABASE] Warning creating index on {collection.name}: {e}")
    except Exception as e:
        logger.warning(f"[DATABASE] Warning creating index on {collection.name}: {e}")

async def init_indexes(db: AsyncIOMotorDatabase):
    await _safe_create_index(db["users"], "email", unique=True, name="users_email_key")
    await _safe_create_index(db["users"], "google_id", sparse=True)
    await _safe_create_index(db["workspaces"], "key", unique=True)
    await _safe_create_index(db["tasks"], [("workspace_id", 1), ("deleted", 1), ("created_at", -1)])
    await _safe_create_index(db["tasks"], [("workspace_id", 1), ("status", 1), ("priority", 1)])
    await _safe_create_index(db["tasks"], [("workspace_id", 1), ("assignee_id", 1)])
    await _safe_create_index(db["tasks"], [("workspace_id", 1), ("created_at", -1)])
    await _safe_create_index(db["notifications"], [("workspace_id", 1), ("created_at", -1)])
    await _safe_create_index(db["audit_logs"], [("resource_id", 1), ("created_at", -1)])
    await _safe_create_index(db["auth_tokens"], "expires_at", expireAfterSeconds=0)
    await _safe_create_index(db["idempotency_keys"], "expires_at", expireAfterSeconds=0)
    await _safe_create_index(db["idempotency_keys"], "key", unique=True)
    await _safe_create_index(db["permissions"], "name", unique=True)
    logger.info("[DATABASE] Database indexes verified successfully.")
