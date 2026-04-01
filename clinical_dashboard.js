document.addEventListener("DOMContentLoaded", () => {
    initPrivacyBlur();
    initOscilloscope();
    initHistoryCharts();
    initSerialConnection();
    renderHeatmap();
});

// --- Privacy Blur (Auto-lock after 5 min) ---
let inactivityTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
const overlay = document.getElementById("privacyOverlay");

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (overlay.classList.contains("hidden")) {
        inactivityTimer = setTimeout(() => {
            overlay.classList.remove("hidden");
        }, INACTIVITY_LIMIT);
    }
}

function initPrivacyBlur() {
    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);
    document.getElementById("btnResumeSession").addEventListener("click", () => {
        overlay.classList.add("hidden");
        resetInactivityTimer();
    });
    resetInactivityTimer();
}

// --- Web Serial Connection (Real + Mock Fallback) ---
const btnSerialConnect = document.getElementById("btnSerialConnect");
const lblSerialConnect = document.getElementById("lblSerialConnect");
let port;
let isConnected = false;
let reader;
let serialDataBuffer = [];

async function initSerialConnection() {
    if (!("serial" in navigator)) {
        btnSerialConnect.title = "Web Serial not supported in this browser. Use Chrome/Edge.";
        btnSerialConnect.style.opacity = "0.5";
        return;
    }

    btnSerialConnect.addEventListener("click", async () => {
        if (!isConnected) {
            try {
                lblSerialConnect.textContent = "Searching...";
                btnSerialConnect.className = "btn-connect connecting";

                port = await navigator.serial.requestPort();
                await port.open({ baudRate: 9600 });
                
                isConnected = true;
                lblSerialConnect.textContent = "Live Data Stream Active";
                btnSerialConnect.className = "btn-connect connected";
                
                readSerialLoop();
            } catch (error) {
                console.error("Serial connection failed", error);
                lblSerialConnect.textContent = "Connect Aura-Sleeve";
                btnSerialConnect.className = "btn-connect disconnected";
            }
        } else {
            // Disconnect
            isConnected = false;
            if (reader) await reader.cancel();
            if (port) await port.close();
            lblSerialConnect.textContent = "Connect Aura-Sleeve";
            btnSerialConnect.className = "btn-connect disconnected";
        }
    });
}

async function readSerialLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            // Expected format from Arduino: "P:450,I:12\n" (Piezo, IMU)
            // Storing raw strings then parsing in the animation loop
            if (value) {
                serialDataBuffer.push(value);
            }
        }
    } catch (error) {
        console.error("Error reading serial", error);
    } finally {
        reader.releaseLock();
    }
}

// --- Oscilloscope Rendering & Real-time FFT ---
const canvas = document.getElementById("oscilloscope");
const ctx = canvas.getContext("2d");
let isFrozen = false;

// 5-second buffer at 60fps = 300 points
const MAX_POINTS = 300;
let timeData = [];
for (let i = 0; i < MAX_POINTS; i++) {
    timeData.push({ p: 50, i: 0 }); // Base baseline
}

document.getElementById("btnFreeze").addEventListener("click", (e) => {
    isFrozen = !isFrozen;
    e.target.textContent = isFrozen ? "Unfreeze" : "Freeze";
    e.target.classList.toggle("btn-primary");
});

function drawGrid() {
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 1;
    
    // Vertical lines (Time divisions) -> every 50px
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines (Amplitude divisions)
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function updateMockData() {
    // Generate organic-looking synthetic tremor data if not connected
    let lastPoint = timeData[timeData.length - 1];
    
    // Synthetic 6Hz baseline + noise
    const time = Date.now() / 1000;
    const mockTremorHz = 6.2;
    const wave = Math.sin(time * Math.PI * 2 * mockTremorHz) * 150;
    const noise = (Math.random() - 0.5) * 50;
    
    let newPiezo = wave + noise + 200; // Center offset
    let newImu = (Math.random() - 0.5) * 40; 
    
    timeData.push({ 
        p: Math.max(0, Math.min(newPiezo, 400)), // clamp
        i: newImu 
    });
    if (timeData.length > MAX_POINTS) timeData.shift();
}

function renderOscilloscope() {
    if (!isFrozen) {
        if (!isConnected) updateMockData();
        // If connected, read from serialDataBuffer and push real points instead.
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Draw Piezo (Red Line)
    ctx.beginPath();
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 2;
    
    const dx = canvas.width / MAX_POINTS;
    
    for (let i = 0; i < timeData.length; i++) {
        const x = i * dx;
        // Invert Y mapping so 0 is bottom
        const y = canvas.height - (timeData[i].p / 400) * canvas.height; 
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary Line: IMU Jitter (Blue)
    ctx.beginPath();
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 1;
    for (let i = 0; i < timeData.length; i++) {
        const x = i * dx;
        const baseline = canvas.height - 20; // Bottom offset
        const y = baseline - timeData[i].i; 
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Update FFT Mock Result sporadically
    if (!isFrozen && Math.random() < 0.05) {
        document.getElementById("lblDominantFreq").textContent = "6.2 Hz";
        const badge = document.getElementById("lblClassification");
        badge.textContent = "Essential Tremor Range (4-12Hz)";
        badge.className = "classification-badge essential";
        document.getElementById("lblConfidence").textContent = "78%";
    }

    requestAnimationFrame(renderOscilloscope);
}

function initOscilloscope() {
    renderOscilloscope();
    renderFFTChart();
}

// Fixed mock view of FFT
function renderFFTChart() {
    const ctxF = document.getElementById("fftChart").getContext('2d');
    new Chart(ctxF, {
        type: 'bar',
        data: {
            labels: ['4', '5', '6', '7', '8', '9', '10', '11', '12'],
            datasets: [{
                label: 'Amplitude',
                data: [10, 20, 100, 30, 25, 10, 5, 2, 0],
                backgroundColor: (ctx) => {
                    return ctx.dataIndex === 2 ? '#059669' : '#E5E7EB'; // Highlight 6Hz
                }
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { display: false }
            }
        }
    });
}

// --- History & Charts ---
function initHistoryCharts() {
    const ctx = document.getElementById("dailyChart").getContext("2d");
    
    // Mock Data for last 14 days
    const labels = Array.from({length: 14}, (_, i) => `Apr ${i+1}`);
    const suppressed = [2.5, 3.0, 2.8, 4.0, 3.5, 3.2, 5.0, 4.2, 3.1, 4.0, 4.5, 3.0, 2.5, 3.8];
    const unsuppressed = [0.5, 0.2, 0.4, 1.0, 0.5, 0.3, 1.2, 0.8, 0.5, 0.6, 0.7, 0.4, 0.3, 0.5];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Unsuppressed Tremor',
                    data: unsuppressed,
                    backgroundColor: '#DC2626',
                    stack: 'Stack 0'
                },
                {
                    label: 'Suppressed Time',
                    data: suppressed,
                    backgroundColor: '#059669',
                    stack: 'Stack 0'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, usePointStyle: true }
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, max: 8 }
            }
        }
    });
}

// Generate the GitHub-style horizontal contribution heatmap
function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    
    // We create 4 rows (weeks) with 7 columns (days) purely for illustration
    for (let w = 0; w < 4; w++) {
        const row = document.createElement('div');
        row.className = 'heatmap-week';
        
        for (let d = 0; d < 7; d++) {
            const cell = document.createElement('div');
            // Randomly assign severity 0-3
            const severity = Math.floor(Math.random() * 4);
            cell.className = `heatmap-cell val-${severity}`;
            cell.title = `Severity Level: ${severity}`;
            row.appendChild(cell);
        }
        
        container.appendChild(row);
    }
}
