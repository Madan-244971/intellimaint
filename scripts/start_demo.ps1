Param(
    [switch]$NoSimulator
)

# Start API on 127.0.0.1:8000 if not already running
$projectRoot = Join-Path $PSScriptRoot ".."
if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet)) {
    Write-Host "Starting API on port 8000..."
    Start-Process -FilePath "cmd" -ArgumentList "/k python -m uvicorn api.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $projectRoot
    Start-Sleep -Seconds 1
} else {
    Write-Host "API port 8000 already in use — skipping API start."
}

# Serve dashboard folder on 127.0.0.1:8001 if not in use
# Make sure path references are relative to repository root
$dashboardPath = Join-Path $PSScriptRoot "..\dashboard"

# Copy logs to dashboard folder so they are accessible by the web page
if (Test-Path (Join-Path $projectRoot "prediction_logs.csv")) {
    Copy-Item (Join-Path $projectRoot "prediction_logs.csv") -Destination $dashboardPath -Force
}

if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 8001 -InformationLevel Quiet)) {
    Write-Host "Starting static server for dashboard on port 8001..."
    Start-Process -FilePath "python" -ArgumentList "-m http.server 8001" -WorkingDirectory $dashboardPath -WindowStyle Hidden
    Start-Sleep -Seconds 1
} else {
    Write-Host "Port 8001 already in use — skipping dashboard server start."
}

# Open dashboard in default browser
Start-Process "http://127.0.0.1:8001"

# Start streaming simulator unless NoSimulator switch is present
if (-not $NoSimulator) {
    Write-Host "Starting streaming simulator (posts sensor data to API)..."
    Start-Process -FilePath "python" -ArgumentList "ml\streaming_simulator.py" -WorkingDirectory $projectRoot -WindowStyle Hidden
}

Write-Host "Demo launcher finished. If the dashboard didn't open, browse to http://127.0.0.1:8001"