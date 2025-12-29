from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Any
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store machine start times
machine_start_time = {}

# Machine base profiles (industry-like)
MACHINE_PROFILE = {
    "motor": {"base_risk": 10},
    "generator": {"base_risk": 20},
    "compressor": {"base_risk": 15},
    "hydraulic": {"base_risk": 18}
}


class SensorPayload(BaseModel):
    temperature: float
    vibration: float
    current: float
    pressure: float = None
    rpm: float = None


def _compute_risk_from_sensors(temperature: float, vibration: float, current: float, base_risk: int = 10) -> Dict[str, Any]:
    """Compute current risk (0-100), forecast (0-100), top feature contributions, and suggestions."""
    risk = base_risk
    contributions = []
    suggestions = []
    causes = []

    # Temperature
    if temperature is not None:
        delta = max(0, temperature - 70)
        contrib = min(25, int(delta * 0.8))
        risk += contrib
        if contrib > 0:
            contributions.append({"feature": "temperature", "contribution": contrib})
            causes.append("Overheating detected")
            suggestions.append("Inspect/repair cooling system")

    # Vibration
    if vibration is not None:
        contrib_v = 0
        if vibration > 4.0:
            contrib_v = 18
        elif vibration > 3.0:
            contrib_v = 10
        risk += contrib_v
        if contrib_v > 0:
            contributions.append({"feature": "vibration", "contribution": contrib_v})
            causes.append("High vibration detected")
            suggestions.append("Check bearings and mounts")

    # Current
    if current is not None:
        contrib_c = 0
        if current > 30:
            contrib_c = 18
        elif current > 25:
            contrib_c = 8
        risk += contrib_c
        if contrib_c > 0:
            contributions.append({"feature": "current", "contribution": contrib_c})
            causes.append("Overcurrent detected")
            suggestions.append("Reduce load or check power system")

    # preserve bounds
    risk = min(int(risk), 100)

    # simple forecast (naive): small upward drift
    forecast = min(100, risk + random.randint(0, 10))

    # confidence heuristic
    confidence = round(min(0.99, 0.5 + (len(contributions) * 0.12)), 2)

    if not causes:
        causes = ["System operating normally"]
        suggestions = ["No action required"]

    return {
        "current_percent": risk,
        "forecast_30min_percent": forecast,
        "top_features": contributions,
        "causes": causes,
        "suggestions": suggestions,
        "confidence": confidence,
    }


@app.get("/predict")
def predict(machine: str = Query(...)):
    machine = machine.lower()

    if machine not in MACHINE_PROFILE:
        return {"error": "Unknown machine"}

    # runtime handling
    if machine not in machine_start_time:
        machine_start_time[machine] = datetime.now()

    runtime_seconds = int((datetime.now() - machine_start_time[machine]).total_seconds())
    hrs = runtime_seconds // 3600
    mins = (runtime_seconds % 3600) // 60
    secs = runtime_seconds % 60
    runtime = f"{hrs:02}:{mins:02}:{secs:02}"

    # sensor simulation (controlled, not random jump)
    temperature = random.randint(55, 90)
    vibration = round(random.uniform(0.5, 5.5), 2)
    current = round(random.uniform(10, 35), 2)

    base = MACHINE_PROFILE[machine]["base_risk"]

    r = _compute_risk_from_sensors(temperature=temperature, vibration=vibration, current=current, base_risk=base)

    status = "NORMAL"
    if r["current_percent"] >= 85:
        status = "CRITICAL"
    elif r["current_percent"] >= 60:
        status = "WARNING"

    return {
        "machine": machine,
        "runtime": runtime,
        "temperature": temperature,
        "vibration": vibration,
        "current": current,
        "failure_risk_percent": r["current_percent"],
        "forecast_30min_percent": r["forecast_30min_percent"],
        "status": status,
        "reasons": r["causes"],
        "suggestions": r["suggestions"],
        "top_features": r["top_features"],
        "confidence": r["confidence"]
    }


@app.post("/predict")
def predict_post(payload: SensorPayload = Body(...)):
    # assume client sends realistic sensor values
    temperature = payload.temperature
    vibration = payload.vibration
    current = payload.current

    # choose a base risk by a simple heuristic (user could send machine type too)
    base = 12

    r = _compute_risk_from_sensors(temperature=temperature, vibration=vibration, current=current, base_risk=base)

    return {
        "current_failure_risk": r["current_percent"] / 100.0,
        "forecast_30min_risk": r["forecast_30min_percent"] / 100.0,
        "cause": "; ".join(r["causes"]),
        "suggestions": r["suggestions"],
        "top_features": r["top_features"],
        "confidence": r["confidence"]
    }
