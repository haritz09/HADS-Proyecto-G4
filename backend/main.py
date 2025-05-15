from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.mongodb import connect_to_mongo, disconnect_from_mongo
from backend.app.api.api_v1.router import api_router

app = FastAPI()

# Enhanced CORS configuration with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    # Remove await since connect_to_mongo is not async
    connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    # Remove await since disconnect_from_mongo is not async
    disconnect_from_mongo()
