import os
import threading
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from api.main import app as api_app
from ml.streaming_simulator import stream

# Use the existing API app
app = api_app

# Mount the dashboard folder to serve static HTML/JS/CSS
app.mount("/", StaticFiles(directory="dashboard", html=True), name="dashboard")

# Start the simulator in a background thread when the server starts
@app.on_event("startup")
async def start_simulator():
    # Get the port Render assigned to us (default 10000 on Render)
    port = os.getenv("PORT", "8000")
    
    # Tell the simulator where to send data (localhost:PORT)
    os.environ["API_URL"] = f"http://127.0.0.1:{port}/predict"
    
    print(f"🚀 Starting Simulator targeting: {os.environ['API_URL']}")
    
    # Run the stream function in a separate thread so it doesn't block the API
    t = threading.Thread(target=stream, daemon=True)
    t.start()