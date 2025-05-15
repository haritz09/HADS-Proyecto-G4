from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.mongodb import connect_to_mongo, disconnect_from_mongo
from backend.app.api.api_v1.router import api_router

app = FastAPI()

origins = [
    "http://localhost:3000",    # React dev server
    "http://127.0.0.1:3000",   # Alternative local address
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
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
