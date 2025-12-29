const API_URL = "http://127.0.0.1:8000/predict";

/* ================= DOM ================= */
const machineSelect = document.getElementById("machine");
const predictBtn = document.getElementById("predictBtn");
const autoBtn = document.getElementById("autoBtn");

const riskText = document.getElementById("riskValue");
const statusText = document.getElementById("statusText");
const lightEl = document.getElementById("light");

const analysisText = document.getElementById("analysisText");
const runtimeEl = document.getElementById("runtime");

/* ================= STATE ================= */
let autoTimer = null;
let runtimeSeconds = 0;
let runtimeTimer = null;

/* ================= RUNTIME ================= */
function startRuntime() {
  runtimeTimer = setInterval(() => {
    runtimeSeconds++;
    const h = String(Math.floor(runtimeSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((runtimeSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(runtimeSeconds % 60).padStart(2, "0");
    runtimeEl.innerText = `${h}:${m}:${s}`;
  }, 1000);
}

function stopRuntime() {
  clearInterval(runtimeTimer);
  runtimeSeconds = 0;
  runtimeEl.innerText = "00:00:00";
}

/* ================= STATUS + LIGHT ================= */
function updateStatus(risk) {
  if (risk < 40) {
    statusText.innerText = "NORMAL";
    lightEl.className = "light green";
  } else if (risk < 70) {
    statusText.innerText = "WARNING";
    lightEl.className = "light yellow";
  } else {
    statusText.innerText = "CRITICAL";
    lightEl.className = "light red blink";
  }
}

/* ================= CHART ================= */
const ctx = document.getElementById("riskChart").getContext("2d");

const riskChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Failure Risk (%)",
      data: [],
      borderWidth: 3,
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: { min: 0, max: 100 }
    }
  }
});

function updateChart(risk) {
  const t = new Date().toLocaleTimeString();
  if (riskChart.data.labels.length > 10) {
    riskChart.data.labels.shift();
    riskChart.data.datasets[0].data.shift();
  }
  riskChart.data.labels.push(t);
  riskChart.data.datasets[0].data.push(risk);
  riskChart.update();
}

/* ================= ALERT ================= */
function sendAlert(risk) {
  if (risk >= 80) {
    alert(`⚠️ CRITICAL ALERT!\nFailure Risk: ${risk}%\nImmediate maintenance required.`);
  }
}

/* ================= BACKEND ================= */
let simStep = 0;

async function predictRisk(auto = false) {
  const machine = machineSelect.value;
  if (!machine) {
    alert("Select a machine first");
    return;
  }

  simStep++;
  // Cycle: Normal for first 7 calls, then Critical for 3 calls
  const isCritical = (simStep % 10) > 7;

  const payload = {
    temperature: Number((isCritical ? (Math.random() * 25 + 95) : (Math.random() * 25 + 60)).toFixed(2)),
    vibration: Number((isCritical ? (Math.random() * 7 + 8) : (Math.random() * 5.5 + 0.5)).toFixed(2)),
    pressure: Number((isCritical ? (Math.random() * 50 + 130) : (Math.random() * 50 + 70)).toFixed(2)),
    rpm: Number((Math.random() * 600 + 1400).toFixed(1)),
    current: Number((isCritical ? (Math.random() * 25 + 35) : (Math.random() * 25 + 10)).toFixed(2)),
    machine_id: machine
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data = await res.json();
    const rawRisk = data.current_failure_risk ?? data.failure_risk ?? 0;
    const risk = Math.round(rawRisk * 100);

    riskText.innerText = `${risk}%`;
    analysisText.innerText = data.cause || "System operating normally";

    updateStatus(risk);
    updateChart(risk);

    if (auto) sendAlert(risk);

  } catch (e) {
    console.error(e);
    analysisText.innerText = "AI Backend Connection Failed. Is the server running?";
  }
}

/* ================= BUTTONS ================= */

/* Predict Risk (ONE TIME) */
predictBtn.onclick = () => {
  predictRisk(false);
};

/* Auto Detect (CONTINUOUS) */
autoBtn.onclick = () => {
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
    stopRuntime();
    autoBtn.innerText = "Auto Detect";
    return;
  }

  startRuntime();
  predictRisk(true);

  autoTimer = setInterval(() => {
    predictRisk(true);
  }, 3000);

  autoBtn.innerText = "Stop Auto Detect";
};
