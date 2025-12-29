# Demo scripts

start_demo.ps1

- Purpose: Launch the API, serve `dashboard/` on port 8001, open the dashboard in your browser, and start the simulator (unless `-NoSimulator` is passed).

How to run (PowerShell):

1. Allow running the script for this session (if needed):

   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

2. Run the demo launcher:

   .\scripts\start_demo.ps1

3. To skip the simulator (if you want to trigger events manually):

   .\scripts\start_demo.ps1 -NoSimulator

Notes:
- If ports 8000 or 8001 are already in use, the script will not start a new process for that port and will print a message instead.
- The script uses `python -m uvicorn api.main:app` — ensure `uvicorn` is installed in your environment.
- If the dashboard does not open automatically, open http://127.0.0.1:8001 in your browser.
