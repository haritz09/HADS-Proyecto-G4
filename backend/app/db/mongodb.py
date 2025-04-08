from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

mongodb = MongoDB()

async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URI)
    mongodb.database = mongodb.client[settings.MONGO_DB_NAME]
    print("Connected to MongoDB")

async def close_mongo_connection():
    if mongodb.client:
        mongodb.client.close()
        print("MongoDB connection closed")