import requests
import random
import time
import csv
import os
from datetime import datetime

# Read API URL from environment variable, default to localhost:8000 for local dev
LOG_FILE = os.path.join("dashboard", "prediction_logs.csv")

def generate_sensor_data(wear_level=0.0, previous_data=None):
    """
    Generates sensor data based on wear level (0.0 to 1.0).
    Uses smoothing to prevent sudden jumps in data.
    """
    # 1. Define 'Center Points' based on wear (Deterministic, not random)
    # As wear increases, the center point shifts gradually.
    center_temp = 60 + (45 * wear_level)      # 60 -> 105 (Starts lower)
    center_vib = 0.5 + (10.0 * wear_level)    # 0.5 -> 10.5 (Starts lower)
    center_pressure = 80 + (60 * wear_level)  # 80 -> 140 (Starts lower)
    center_current = 10 + (35 * wear_level)   # 10 -> 45 (Starts lower)
    center_rpm = 1700                         # Constant center

    # 2. If this is the first run, start at the center points
    if previous_data is None:
        return {
            "temperature": round(center_temp, 2),
            "vibration": round(center_vib, 2),
            "pressure": round(center_pressure, 2),
            "rpm": round(center_rpm, 1),
            "current": round(center_current, 2),
        }

    # 3. Update Logic: Drift towards center + Small Random Noise
    # This prevents sudden jumps. We modify the *previous* value.
    def update_val(current, target, noise_max):
        drift = (target - current) * 0.1  # Move 10% towards target (Inertia)
        noise = random.uniform(-noise_max, noise_max) # Small jitter
        return current + drift + noise

    new_temp = update_val(previous_data["temperature"], center_temp, 1.0)
    new_vib = update_val(previous_data["vibration"], center_vib, 0.2)
    new_pressure = update_val(previous_data["pressure"], center_pressure, 1.5)
    new_current = update_val(previous_data["current"], center_current, 1.0)
    new_rpm = update_val(previous_data["rpm"], center_rpm, 10.0)

    return {
        "temperature": round(new_temp, 2),
        "vibration": round(new_vib, 2),
        "pressure": round(new_pressure, 2),
        "rpm": round(new_rpm, 1),
        "current": round(new_current, 2),
    }

def stream():
    # Fetch API_URL here to ensure we get the updated env var from render_app.py
    api_url = os.getenv("API_URL", "http://127.0.0.1:8000/predict")
    print(f"🔄 Live sensor stream started targeting: {api_url}\n")
    # Simulation state
    runtime_hours = 0.0
    time_increment = 1.0 # Each step adds 1.0 hours (Report saves every 1hr)
    
    # Track state for multiple machines
    machines = ["motor", "generator", "compressor", "hydraulic"]
    machine_states = {m: {'wear': 0.0, 'data': None} for m in machines}

    # Initialize CSV with header if it doesn't exist
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["time", "machine", "risk", "status"])

    while True:
        runtime_hours += time_increment
        
        # LOGIC: 
        # 0-1 Hours: Perfect Health (Wear = 0%)
        # 1-3 Hours: Slight Wear (Wear 0% -> 10%) -> Shows small risk increase
        # 3-8 Hours: Major Degradation (Wear 10% -> 100%)
        
        # Calculate base wear for this hour
        base_wear = 0.0
        if runtime_hours < 1.0:
            base_wear = 0.0
        elif runtime_hours < 3.0:
            base_wear = (runtime_hours - 1.0) * 0.05
        elif runtime_hours < 8.0:
            base_wear = 0.1 + ((runtime_hours - 3.0) / 5.0) * 0.9
        else:
            base_wear = 1.0

        # CHANGED: No auto-repair. Machine stays broken to show persistent risk.
        # We only reset if the runtime gets very high (simulating a new demo run).
        if runtime_hours > 15.0:
            print("\n🛑 CRITICAL FAILURE PERSISTED. RESTARTING DEMO SCENARIO...\n")
            runtime_hours = 0.0
            machine_states = {m: {'wear': 0.0, 'data': None} for m in machines}
            time.sleep(2)
            continue

        # Process EACH machine for this hour
        for m_id in machines:
            # Add slight random variation to wear so machines don't look identical
            variation = random.uniform(-0.05, 0.05)
            current_wear = max(0.0, min(1.0, base_wear + variation))
            
            # Generate data
            prev_data = machine_states[m_id]['data']
            new_data = generate_sensor_data(wear_level=current_wear, previous_data=prev_data)
            machine_states[m_id]['data'] = new_data
            
            # Add machine_id to payload
            payload = new_data.copy()
            payload['machine_id'] = m_id

            try:
                response = requests.post(API_URL, json=payload)

                if response.status_code != 200:
                    print(f"❌ API ERROR ({m_id}):", response.text)
                    continue

                result = response.json()

                current_risk = result.get("current_failure_risk")
                forecast_risk = result.get("forecast_30min_risk")

                if current_risk is None:
                    print(f"❌ API returned unexpected payload for {m_id}")
                else:
                    # Force 0% for first 1 hour only (Clean start)
                    if runtime_hours < 1.0:
                        current_risk = 0.0

                    status = "🚨 RISK" if current_risk >= 0.7 else "✅ OK"

                    # Write to Dashboard CSV immediately
                    with open(LOG_FILE, 'a', newline='') as f:
                        writer = csv.writer(f)
                        writer.writerow([
                            datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
                            m_id,
                            f"{current_risk:.2f}",
                            status
                        ])
                    
                    # Only print to console for the first machine to avoid spamming, 
                    # or print a summary line
                    if m_id == "motor":
                        # Format runtime as HH:MM:SS
                        total_seconds = int(round(runtime_hours * 3600))
                        h = total_seconds // 3600
                        m = (total_seconds % 3600) // 60
                        s = total_seconds % 60
                        time_str = f"{h:02d}:{m:02d}:{s:02d}"
                        print(f"⏱️ {time_str} | Processing all machines... (Motor Risk: {current_risk:.2%})")

            except Exception as e:
                print(f"❌ ERROR ({m_id}):", e)

        time.sleep(1)

if __name__ == "__main__":
    stream()
