const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Solidify Express Middleware
app.use(cors({ origin: '*' })); // Configure properly for production
app.use(express.json()); // Global JSON parsing
app.use(express.urlencoded({ extended: true }));

// Custom middleware for request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Serve frontend files
app.use(express.static(path.join(__dirname))); 

// Mock patient device state (for tuning)
let deviceSettings = {
    sensitivity: 50,
    maxPressure: 35,
    hapticFeedback: true
};

// Simulated mock database calls for different timeframes
function generateTelemetryData(period) {
    let rawTremorData = [];
    let suppressedData = [];
    let dominantFreqData = [];
    let morningEvents = [];
    let afternoonEvents = [];
    let eveningEvents = [];
    let labels = [];
    let points = 30; // default points

    if (period === '1') {
        points = 24; // 24 hours
        labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    } else if (period === '7') {
        points = 7;
        labels = Array.from({length: 7}, (_, i) => `Day ${i + 1}`);
    } else {
        points = 30;
        labels = Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
    }

    let rawBase = 70;
    for (let i = 0; i < points; i++) {
        // Vary base for realism
        rawBase = Math.max(45, Math.min(95, rawBase + (Math.random() * 30 - 15)));
        rawTremorData.push(Math.round(rawBase));
        
        // Suppressed relies on settings to reflect fake tuning impact
        let suppressionFactor = 0.15 + (Math.random() * 0.1); 
        suppressedData.push(Math.round(Math.max(10, rawBase * suppressionFactor)));
        
        dominantFreqData.push(5.8 + (Math.random() * 1.5 - 0.7));

        if (period === '1') { // 1 Day (hourly events are sparse)
            morningEvents.push(Math.random() > 0.8 ? 1 : 0);
            afternoonEvents.push(Math.random() > 0.8 ? 1 : 0);
            eveningEvents.push(Math.random() > 0.8 ? 1 : 0);
        } else {
            morningEvents.push(Math.floor(Math.random() * 5));
            afternoonEvents.push(Math.floor(Math.random() * 6));
            eveningEvents.push(Math.floor(Math.random() * 4));
        }
    }

    // Dynamic aggregated KPIs
    const avgEfficacy = Math.round((1 - (suppressedData.reduce((a, b) => a + b, 0) / rawTremorData.reduce((a, b) => a + b, 0))) * 1000) / 10;
    const avgFreq = (dominantFreqData.reduce((a, b) => a + b, 0) / points).toFixed(1);
    
    return {
        labels,
        rawTremorData,
        suppressedData,
        dominantFreqData,
        morningEvents,
        afternoonEvents,
        eveningEvents,
        kpis: {
            efficacy: `${avgEfficacy}%`,
            freq: `${avgFreq} Hz`,
            adherence: `${(Math.random() * 4 + 6).toFixed(1)} hrs`, // random between 6-10 hrs
            reaction: `${Math.round(200 + Math.random() * 80)} ms`
        }
    };
}

// API Routes
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'ARMEX Backend is operational', timestamp: new Date() });
});

app.get('/api/telemetry', (req, res) => {
    try {
        // period refers to Days: '1', '7', '30'
        const period = req.query.period || '30';
        const data = generateTelemetryData(period);
        res.json(data);
    } catch (error) {
        console.error('Error generating telemetry:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/settings', (req, res) => {
    try {
        res.json(deviceSettings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});

app.post('/api/settings', (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Bad Request: No body provided' });
        }
        deviceSettings = { ...deviceSettings, ...req.body };
        res.json({ success: true, message: 'Settings upgraded remotely.', settings: deviceSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Fallback middleware for all frontend pages (SPA support)
app.use((req, res, next) => {
    // skip api calls
    if (req.url.startsWith('/api/')) return next();
    
    // allow files
    if (req.url.includes('.')) return next();
    
    const defaultPage = path.join(__dirname, 'web.html'); // Since web.html is the landing page
    if (fs.existsSync(defaultPage)) {
        res.sendFile(defaultPage);
    } else {
        res.status(404).send('Landing page not found.');
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[Unhandled Error] ${err.stack}`);
    res.status(500).json({
        success: false,
        error: 'A critical server error occurred.',
    });
});

const server = app.listen(PORT, () => {
    console.log(`[ARMEX Backend] Server running solidly at http://localhost:${PORT}`);
});

// Graceful Shutdown Events
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
