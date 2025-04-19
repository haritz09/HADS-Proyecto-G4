from pymongo import MongoClient
from backend.app.core.config import settings

_client = None

def connect_to_mongo():
    global _client
    try:
        _client = MongoClient(settings.MONGO_URI)
        db = _client[settings.MONGO_DB_NAME]
        # Test the connection
        db.command('ping')
        return db
    except Exception as e:
        raise Exception(f"Could not connect to MongoDB: {str(e)}")

def disconnect_from_mongo():
    global _client
    if _client:
        try:
            _client.close()
            _client = None
        except Exception as e:
            raise Exception(f"Error disconnecting from MongoDB: {str(e)}")