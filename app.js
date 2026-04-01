// Global Chart Configuration
Chart.defaults.color = '#9aa0bc';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(21, 22, 28, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.borderColor = '#262835';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// Global Instances
let efficacyChart, eventsChart;
let currentData = null; // Store for CSV export

// --- DATA FETCHING ---
async function fetchTelemetry(periodStr) {
    // Map dropdown strings to API values
    let periodVal = '30';
    if (periodStr.includes('1 Day')) periodVal = '1';
    if (periodStr.includes('7 Days')) periodVal = '7';

    try {
        const response = await fetch(`/api/telemetry?period=${periodVal}`);
        const data = await response.json();
        currentData = data;
        updateDashboard(data);
    } catch (err) {
        console.error("Failed to fetch telemetry", err);
    }
}

// --- DASHBOARD UPDATES ---
function updateDashboard(data) {
    // 1. Update KPIs
    document.getElementById('val-efficacy').textContent = data.kpis.efficacy;
    document.getElementById('val-freq').textContent = data.kpis.freq;
    document.getElementById('val-hours').textContent = data.kpis.adherence;
    document.getElementById('val-reaction').textContent = data.kpis.reaction;

    // 2. Render Line Chart
    const ctxEfficacy = document.getElementById('efficacyChart').getContext('2d');
    if (efficacyChart) efficacyChart.destroy();

    efficacyChart = new Chart(ctxEfficacy, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Raw Tremor (Baseline)',
                    data: data.rawTremorData,
                    borderColor: '#ff4a4a',
                    backgroundColor: 'rgba(255, 74, 74, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    fill: true,
                },
                {
                    label: 'Suppressed Amplitude',
                    data: data.suppressedData,
                    borderColor: '#00e57c',
                    backgroundColor: 'rgba(0, 229, 124, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    fill: true,
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false } },
                y: { beginAtZero: true, max: 100, title: { display: true, text: '↑ Intensity (Normalized)', color: '#9aa0bc' }, grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false } }
            }
        }
    });

    // 3. Render Bar Chart
    const ctxEvents = document.getElementById('eventsChart').getContext('2d');
    if (eventsChart) eventsChart.destroy();

    eventsChart = new Chart(ctxEvents, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                { label: 'Morning', data: data.morningEvents, backgroundColor: '#ffb03a', stacked: true },
                { label: 'Afternoon', data: data.afternoonEvents, backgroundColor: '#3a82ff', stacked: true },
                { label: 'Evening', data: data.eveningEvents, backgroundColor: '#a55eea', stacked: true }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: '↑ Event Count', color: '#9aa0bc' }, grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false } }
            }
        }
    });

    // Re-apply meds if active
    if (medsOverlayActive) applyMedsOverlay();
}

// --- MEDICATION OVERLAY ---
const btnToggleMeds = document.getElementById('toggle-meds');
let medsOverlayActive = false;

// Mock data independent of scaling
const medEvents = [
    { idx: 2, value: 85, label: "Started L-DOPA" },
    { idx: 10, value: 75, label: "Missed Dose" }
];

function applyMedsOverlay() {
    if(!efficacyChart) return;
    
    if (medsOverlayActive && currentData) {
        const medData = Array(currentData.labels.length).fill(null);
        medEvents.forEach(evt => { 
            if(navDataLength() > evt.idx) medData[evt.idx] = evt.value + 5; 
        });
        
        // Remove existing scatter if present
        efficacyChart.data.datasets = efficacyChart.data.datasets.filter(ds => ds.type !== 'scatter');
        
        efficacyChart.data.datasets.push({
            label: 'Medication Event',
            type: 'scatter',
            data: medData,
            backgroundColor: '#00ffff',
            pointStyle: 'triangle',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false
        });
    } else {
        efficacyChart.data.datasets = efficacyChart.data.datasets.filter(ds => ds.type !== 'scatter');
    }
    efficacyChart.update();
}

function navDataLength() {
    return currentData ? currentData.labels.length : 30;
}

btnToggleMeds.addEventListener('click', () => {
    medsOverlayActive = !medsOverlayActive;
    btnToggleMeds.classList.toggle('active', medsOverlayActive);
    applyMedsOverlay();
});

// --- TIME PERIOD SELECTOR ---
document.getElementById('period').addEventListener('change', (e) => {
    fetchTelemetry(e.target.value);
});

// --- EXPORT CSV LOGIC ---
document.getElementById('btn-export').addEventListener('click', () => {
    if(!currentData) return alert("No data to export");
    let csvContent = "data:text/csv;charset=utf-8,Time,Raw Tremor,Suppressed Tremor,Morning Events,Afternoon Events,Evening Events\n";
    
    for(let i=0; i<currentData.labels.length; i++) {
        csvContent += `${currentData.labels[i]},${currentData.rawTremorData[i]},${currentData.suppressedData[i]},${currentData.morningEvents[i]},${currentData.afternoonEvents[i]},${currentData.eveningEvents[i]}\n`;
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "patient_aura_sleeve_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// --- TAB NAVIGATION LOGIC ---
const tabs = document.querySelectorAll('.nav-link');
const viewOverview = document.getElementById('view-overview');
const viewTuning = document.getElementById('view-tuning');
const viewLogs = document.getElementById('view-logs');

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Hide all
        viewOverview.style.display = 'none';
        viewTuning.style.display = 'none';
        viewLogs.style.display = 'none';
        
        // Show target
        const target = tab.getAttribute('data-target');
        if(target === 'overview') viewOverview.style.display = 'flex';
        if(target === 'tuning') {
            viewTuning.style.display = 'block';
            fetchSettings();
        }
        if(target === 'logs') viewLogs.style.display = 'block';
    });
});

// --- DEVICE TUNING LOGIC ---
async function fetchSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        document.getElementById('tune-sens').value = data.sensitivity;
        document.getElementById('tune-pres').value = data.maxPressure;
        document.getElementById('tune-haptic').checked = data.hapticFeedback;
    } catch(e) { console.warn(e); }
}

document.getElementById('btn-save-tune')?.addEventListener('click', async () => {
    const payload = {
        sensitivity: document.getElementById('tune-sens').value,
        maxPressure: document.getElementById('tune-pres').value,
        hapticFeedback: document.getElementById('tune-haptic').checked
    };
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        alert('Device parameters pushed to Aura-Sleeve securely.');
    } catch(e) { console.error(e); }
});

// Trigger initial load
fetchTelemetry(document.getElementById('period').value);
