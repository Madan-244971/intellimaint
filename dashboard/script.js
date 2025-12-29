/* ================= AUTHENTICATION CHECK ================= */
const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!currentUser) {
  window.location.href = 'login.html';
} else {
  // Display user info if element exists
  const userDisplay = document.getElementById('userDisplay');
  if (userDisplay) {
    userDisplay.innerText = `${currentUser.role}: ${currentUser.username}`;
  }
}

function logout() {
  sessionStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

/* ================= THEME LOGIC ================= */
const style = document.createElement('style');
style.innerHTML = `
  body.light-mode { background: #f0f2f5 !important; color: #333 !important; }
  body.light-mode .panel { background: #fff !important; border: 1px solid #ccc !important; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  body.light-mode h1, body.light-mode h2, body.light-mode h3, body.light-mode h4 { color: #111 !important; }
  body.light-mode .status-box { background: #e9ecef !important; border: 1px solid #ccc !important; }
  body.light-mode .status-box h3 { color: #333 !important; }
  body.light-mode .analysis { background: #f8f9fa !important; border: 1px solid #ddd !important; }
  body.light-mode .analysis p { color: #555 !important; }
  body.light-mode select { background: #fff !important; color: #333 !important; border: 1px solid #ccc !important; }
  body.light-mode nav a { color: #555 !important; }
  body.light-mode nav a[style*="border-bottom"] { color: #000 !important; }
  body.light-mode nav span { color: #007bff !important; }
  body.light-mode table { color: #333 !important; }
  body.light-mode th { border-bottom: 1px solid #ccc !important; }
  body.light-mode td { border-bottom: 1px solid #eee !important; }
`;
document.head.appendChild(style);
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-mode');
}

// Use relative path so it works on deployed URL automatically
const API_URL = "/predict";

const riskText = document.getElementById("riskValue");
const statusText = document.getElementById("statusText");
const analysisText = document.getElementById("analysisText");
const light = document.getElementById("light");
const runtimeEl = document.getElementById("runtime");
const machineSelect = document.getElementById("machine");
const forecastEl = document.getElementById("forecastValue");
const confidenceEl = document.getElementById("confidence");
const recommendationBox = document.getElementById("recommendationBox");
const recommendationsEl = document.getElementById("recommendations");
const featuresList = document.getElementById("featuresList");
const sensorList = {
  temp: document.getElementById("tempVal"),
  vib: document.getElementById("vibVal"),
  cur: document.getElementById("curVal")
};

/* ================= Runtime ================= */

/* ================= Chart ================= */
const ctx = document.getElementById("riskChart");
const gradient = ctx.getContext('2d').createLinearGradient(0,0,0,300);
gradient.addColorStop(0, 'rgba(255,0,0,0.7)');
gradient.addColorStop(0.5, 'rgba(255,165,0,0.3)');
gradient.addColorStop(1, 'rgba(0,255,0,0.1)');

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Failure Risk (%)",
      data: [],
      borderWidth: 3,
      tension: 0.4,
      backgroundColor: gradient,
      fill: true,
      pointRadius: 3,
      borderColor: '#ff6b6b'
    }]
  },
  options: {
    animation: false,
    scales: { y: { min: 0, max: 100 } },
    plugins: {
      tooltip: { mode: 'index', intersect: false }
    }
  }
});

/* ================= TOAST / ALERT ================= */
function showAlert(title, message, suggestions = []) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alertModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalActions = document.getElementById('modalActions');
    const ackBtn = document.getElementById('ackBtn');

    modalTitle.innerText = title;
    modalBody.innerText = message;
    modalActions.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');

    modal.style.display = 'flex';

    function onAck() {
      modal.style.display = 'none';
      ackBtn.removeEventListener('click', onAck);
      resolve(true);
    }

    ackBtn.addEventListener('click', onAck);

    // auto-dismiss after 20s
    setTimeout(() => {
      if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        ackBtn.removeEventListener('click', onAck);
        resolve(false);
      }
    }, 20000);
  });
}

/* ================= Status Logic ================= */
function updateStatus(risk, cause) {
  if (risk < 40) {
    statusText.innerText = "NORMAL";
    light.className = "light green";
    analysisText.innerText = "AI monitoring normal";
  }
  else if (risk < 75) {
    statusText.innerText = "WARNING";
    light.className = "light yellow";
    analysisText.innerText = cause || "Potential anomaly detected";
  }
  else {
    statusText.innerText = "CRITICAL";
    light.className = "light red blink";
    analysisText.innerText = `⚠ CRITICAL ALERT: ${cause || "High failure probability detected"}`;
  }
}

/* ================= AI AUTO DETECTION ================= */
let simRuntime = 0.0;
let lastSensors = null;

async function detectRisk() {
  try {
    // Simulation Logic: Drift & Wear (No sudden jumps, No auto-repair)
    simRuntime += 0.2;

    // Update Runtime Display (Sync with simulation time)
    const totalSeconds = Math.round(simRuntime * 3600);
    const rHours = Math.floor(totalSeconds / 3600);
    const rMins = Math.floor((totalSeconds % 3600) / 60);
    const rSecs = totalSeconds % 60;
    runtimeEl.innerText = `${String(rHours).padStart(2, "0")}:${String(rMins).padStart(2, "0")}:${String(rSecs).padStart(2, "0")}`;
    
    let wear = 0;
    if (simRuntime < 1.0) {
        wear = 0;
    } else if (simRuntime < 3.0) {
        wear = (simRuntime - 1.0) * 0.05; // Slight wear (0 -> 0.1)
    } else if (simRuntime < 8.0) {
        wear = 0.1 + ((simRuntime - 3.0) / 5.0) * 0.9; // Major wear (0.1 -> 1.0)
    } else {
        wear = 1.0; // Stay critical
    }

    // Reset demo loop after long failure (e.g. 15 hours)
    if (simRuntime > 15.0) {
        simRuntime = 0;
        wear = 0;
        lastSensors = null;
    }

    // Target values based on wear
    const target = {
        temp: 60 + (45 * wear), // Lower start point (60)
        vib: 0.5 + (10 * wear), // Lower start point (0.5)
        pressure: 80 + (60 * wear), // Lower start point (80)
        current: 10 + (35 * wear), // Lower start point (10)
        rpm: 1700
    };

    if (!lastSensors) {
        lastSensors = { ...target };
    }

    // Smoothing function
    const smooth = (prev, tgt, noise) => prev + ((tgt - prev) * 0.1) + ((Math.random() - 0.5) * noise);

    lastSensors.temp = smooth(lastSensors.temp, target.temp, 2.0);
    lastSensors.vib = smooth(lastSensors.vib, target.vib, 0.4);
    lastSensors.pressure = smooth(lastSensors.pressure, target.pressure, 3.0);
    lastSensors.current = smooth(lastSensors.current, target.current, 2.0);
    lastSensors.rpm = smooth(lastSensors.rpm, target.rpm, 20.0);

    const payload = {
      temperature: Number(lastSensors.temp.toFixed(2)),
      vibration: Number(lastSensors.vib.toFixed(2)),
      pressure: Number(lastSensors.pressure.toFixed(2)),
      rpm: Number(lastSensors.rpm.toFixed(1)),
      current: Number(lastSensors.current.toFixed(2)),
      machine_id: machineSelect.value
    };

    // use POST to match backend expectation
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    // Merge payload into data so the UI can display the sensor values we sent
    Object.assign(data, payload);

    /* ===== Parse and normalize ===== */
    let risk = data.current_failure_risk ?? data.failure_risk_percent ?? data.failure_risk ?? 0;
    let forecast = data.forecast_30min_risk ?? data.forecast_30min_percent ?? data.forecast_30min ?? 0;

    // If backend sent fractions (0-1), convert
    if (risk <= 1) risk = Math.round(risk * 100);
    if (forecast <= 1) forecast = Math.round(forecast * 100);

    risk = Math.round(risk);
    forecast = Math.round(forecast);

    // FORCE 0% for the first 1 hour only
    if (simRuntime < 1.0) {
        risk = 0;
        forecast = 0;
    }

    /* ===== Update sensor UI ===== */
    if (data.temperature !== undefined) sensorList.temp.innerText = data.temperature;
    if (data.vibration !== undefined) sensorList.vib.innerText = data.vibration;
    if (data.current !== undefined) sensorList.cur.innerText = data.current;

    /* ===== UI UPDATE ===== */
    riskText.innerText = `${risk}%`;
    forecastEl.innerText = `${forecast}%`;

    if (data.confidence !== undefined) confidenceEl.innerText = `(conf ${data.confidence})`;

    // store latest response for 'Why?' modal
    window.latestData = data;

    updateStatus(risk, (data.reasons || []).join('; '));

    /* ===== Recommendations & features ===== */
    const suggestions = data.suggestions || [];
    const features = data.top_features || [];

    if (suggestions.length) {
      recommendationBox.style.display = 'block';
      recommendationsEl.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
    } else {
      recommendationBox.style.display = 'none';
    }

    featuresList.innerHTML = features.map(f => `<li>${f.feature} (+${f.contribution})</li>`).join('');

    /* ===== Chart Update ===== */
    // Use simulated time for chart labels to match the runtime display
    const time = `${String(rHours).padStart(2, "0")}:${String(rMins).padStart(2, "0")}:${String(rSecs).padStart(2, "0")}`;

    if (chart.data.labels.length > 40) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(risk);
    chart.update();

    /* ===== Alerts ===== */
    if (risk >= 85) {
      showAlert('CRITICAL RISK', `Machine at ${risk}% risk. ${data.reasons ? data.reasons.join('; ') : ''}`, suggestions);
    }

  } catch (err) {
    console.error(err);
    if (err.message.includes("Failed to fetch")) {
      analysisText.innerText = "❌ Connection Failed. Is the backend running?";
    } else {
      analysisText.innerText = `❌ Error: ${err.message}`;
    }
  }
}

/* ================= WHY modal (explanation) ================= */
const whyBtn = document.getElementById('whyBtn');
const whyModal = document.getElementById('whyModal');
const whySummary = document.getElementById('whySummary');
const whySensors = document.getElementById('whySensors');
const whySuggestions = document.getElementById('whySuggestions');
const whyClose = document.getElementById('whyClose');
let whyChart = null;

function openWhyModal() {
  const data = window.latestData;
  if (!data) {
    alert('No data available yet. Wait for the first update.');
    return;
  }

  // Build a short summary
  const reasons = data.reasons || (data.cause ? data.cause.split('; ') : ['No specific causes detected']);
  whySummary.innerText = reasons.join('; ');

  // Sensors
  whySensors.innerHTML = '';
  if (data.temperature !== undefined) whySensors.innerHTML += `<li>Temperature: ${data.temperature} °C</li>`;
  if (data.vibration !== undefined) whySensors.innerHTML += `<li>Vibration: ${data.vibration} g</li>`;
  if (data.current !== undefined) whySensors.innerHTML += `<li>Current: ${data.current} A</li>`;

  // Suggestions
  whySuggestions.innerHTML = (data.suggestions || []).map(s => `<li>${s}</li>`).join('');

  // chart (top features)
  const features = data.top_features || [];
  const labels = features.map(f => f.feature);
  const values = features.map(f => f.contribution);

  const ctx = document.getElementById('whyChart').getContext('2d');
  if (whyChart) whyChart.destroy();
  whyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ data: values, backgroundColor: '#ff6b6b' }]
    },
    options: {
      indexAxis: 'y',
      scales: { x: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });

  whyModal.style.display = 'flex';
}

function closeWhyModal() {
  whyModal.style.display = 'none';
}

whyBtn.addEventListener('click', openWhyModal);
whyClose.addEventListener('click', closeWhyModal);

/* ================= 3D VISUAL (three.js) ================= */
function init3D() {
  // lazy load three.js from CDN
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r152/three.min.js';
  script.onload = () => {
    const container = document.createElement('div');
    container.id = 'three-container';
    container.style.width = '100%';
    container.style.height = '220px';
    const rightPanel = document.querySelector('.right');
    rightPanel.insertBefore(container, rightPanel.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.TorusKnotGeometry(0.7, 0.25, 120, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b6b, metalness: 0.6, roughness: 0.2 });
    const knot = new THREE.Mesh(geometry, material);

    scene.add(knot);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);

    function animate() {
      requestAnimationFrame(animate);
      knot.rotation.x += 0.005;
      knot.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();

    // handle resize
    window.addEventListener('resize', () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    });
  };
  document.head.appendChild(script);
}

/* ================= LOGS (CSV) ================= */
async function loadLogs() {
  try {
    const res = await fetch('/prediction_logs.csv');
    if (!res.ok) {
      // try relative path fallback
      const res2 = await fetch('../prediction_logs.csv');
      if (!res2.ok) return;
      const txt = await res2.text();
      populateLogs(txt);
      return;
    }
    const text = await res.text();
    populateLogs(text);
  } catch (e) {
    console.warn('Could not load logs:', e);
  }
}

function populateLogs(csvText) {
  const lines = csvText.trim().split('\n');
  const rows = lines.slice(1).map(l => l.split(','));
  const tbody = document.querySelector('#logsTable tbody');
  tbody.innerHTML = '';
  rows.slice(-12).reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style=\"text-align:left\">${r[0]}</td><td>${Math.round(parseFloat(r[2])*100)}%</td><td>${r[3]}</td>`;
    tbody.appendChild(tr);
  });
}

/* ================= MACHINE SWITCH HANDLING ================= */
function resetForMachine() {
  // clear chart
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();

  // reset UI
  riskText.innerText = '0%';
  forecastEl.innerText = '0%';
  confidenceEl.innerText = '(conf 0.00)';
  sensorList.temp.innerText = '--';
  sensorList.vib.innerText = '--';
  sensorList.cur.innerText = '--';
  recommendationBox.style.display = 'none';
  recommendationsEl.innerHTML = '';
  featuresList.innerHTML = '';
  analysisText.innerText = `Switching to ${machineSelect.value}... fetching data...`;
  window.latestData = null;

  // clear logs display
  const tbody = document.querySelector('#logsTable tbody');
  if (tbody) tbody.innerHTML = '';
}

machineSelect.addEventListener('change', () => {
  resetForMachine();
  loadLogs();
  // fetch immediately for the new machine
  detectRisk();
});

/* ================= AUTO START ================= */
init3D();
setInterval(detectRisk, 3000);
// initial call
detectRisk();
loadLogs();
