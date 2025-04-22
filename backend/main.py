from fastapi import FastAPI
from backend.app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.api_v1.router import api_router

app = FastAPI()
app.include_router(api_router, prefix="/api")
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    