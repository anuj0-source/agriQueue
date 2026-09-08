from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "This is AgriQueue backend"}

@app.get("/health")
async def get_health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def read_root():
    return {"message": "This is AgriQueue backend"}

@app.get("/health")
async def get_health():
    return {"status": "ok"}