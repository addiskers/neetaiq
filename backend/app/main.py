import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routers import overview, candidates, search, tweets

app = FastAPI(
    title="NetaIQ API",
    description="India's Election Intelligence Platform",
    version="2.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT", "development") != "production" else None,
)

# CORS
origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(overview.router)
app.include_router(candidates.router)
app.include_router(search.router)
app.include_router(tweets.router)


@app.get("/")
def root():
    return {"message": "NetaIQ API", "version": "2.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
