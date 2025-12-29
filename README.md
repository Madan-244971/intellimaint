# IntelliMaint

An experimental predictive maintenance playground.

## Run the API (dev)

1. Create and activate a Python environment with dependencies in `requirements.txt`.
2. Run the API:

   uvicorn api.main:app --reload --host 127.0.0.1 --port 8000

3. Open the dashboard: open `dashboard/index.html` in a browser (or serve with a static server).

## New features (added)

- `GET /predict?machine=<name>` returns sensor simulation, `failure_risk_percent`, `forecast_30min_percent`, `suggestions`, `top_features`, and `confidence`.
- `POST /predict` accepts sensor JSON and returns `current_failure_risk` and `forecast_30min_risk` (as fractions), `suggestions`, and `top_features` — useful for streaming input.
- The dashboard now displays:
  - Live risk (%) and 30-minute forecast
  - Sensor readings (temperature, vibration, current)
  - Recommendations and top contributing features
  - A real-time chart with gradient fill
  - A simple 3D rotating model (via three.js)
  - Alert popups when risk is critical

## How to test streaming

Run:

    python ml/streaming_simulator.py

It will POST sensor JSON to the API and print risk updates.
