// CalmTech Premium Design JS Implementation
document.addEventListener('DOMContentLoaded', () => {

    // Global constraints
    const hapticEnabled = !!navigator.vibrate;

    // --- Navigation (Floating Pill) ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            
            navItems.forEach(nav => {
                nav.classList.remove('active');
                // swap icon to line variant if inactive
                const ic = nav.querySelector('i');
                ic.className = ic.className.replace('ph-fill', 'ph');
            });
            
            item.classList.add('active');
            const icon = item.querySelector('i');
            icon.className = icon.className.replace('ph ', 'ph-fill ');

            const targetId = item.getAttribute('data-target');
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- Hero Ring Animation Initializer ---
    // Circumference = 2 * PI * r (r=85) = 534
    function setRingProgress(percent) {
        const ring = document.getElementById('suppressionRing');
        const circumference = 534;
        const offset = circumference - (percent / 100) * circumference;
        ring.style.strokeDashoffset = offset;
    }
    
    // Animate to 65% on load
    setTimeout(() => setRingProgress(65), 500);

    // --- Connection Logic & Smart States ---
    const btnConnect = document.getElementById('btnConnect');
    const lblConnect = document.getElementById('lblConnect');
    const iconConnect = btnConnect.querySelector('i');
    
    const dotStatus = document.getElementById('dotStatus');
    const lblStatus = document.getElementById('lblStatus');
    const lblBattery = document.getElementById('lblBattery');
    
    let isConnected = false;

    // --- Bluetooth State & Variables ---
    let bluetoothDevice;
    let bluetoothCharacteristic;

    btnConnect.addEventListener('click', async () => {
        if (hapticEnabled) navigator.vibrate(40);

        if (!isConnected) {
            try {
                // Connecting phase UI
                lblConnect.textContent = "Pairing...";
                iconConnect.className = "ph ph-spinner-gap ph-spin";
                btnConnect.style.transform = "scale(0.95)";

                // [OPEN END] Requesting Bluetooth Device
                // Note: Change `acceptAllDevices: true` to a specific service UUID if needed (e.g., { services: ['battery_service'] })
                bluetoothDevice = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true, 
                    optionalServices: ['generic_access'] // Add your Arduino's specific UUID service here
                });

                bluetoothDevice.addEventListener('gattserverdisconnected', handleDisconnect);

                lblConnect.textContent = "Connecting...";
                
                // Connect to GATT Server
                const server = await bluetoothDevice.gatt.connect();
                console.log("[BLUETOOTH] Connected to GATT Server");

                // [OPEN END] Get Service and Characteristic
                // Uncomment and update these with your Arduino's UUIDs to start receiving stream data:
                /*
                const service = await server.getPrimaryService('YOUR_SERVICE_UUID');
                bluetoothCharacteristic = await service.getCharacteristic('YOUR_CHARACTERISTIC_UUID');
                
                // Start receiving data
                await bluetoothCharacteristic.startNotifications();
                bluetoothCharacteristic.addEventListener('characteristicvaluechanged', handleIncomingData);
                */

                btnConnect.style.transform = "scale(1)";
                isConnected = true;
                
                // Active State Styling
                btnConnect.className = "btn-connect connected";
                lblConnect.textContent = "Connected";
                iconConnect.className = "ph-fill ph-check-circle";
                
                dotStatus.classList.add('active');
                lblStatus.textContent = "Live Stream";
                lblStatus.className = "status-text";
                lblBattery.textContent = "Battery 85%"; // [OPEN END] Update from Bluetooth data if available
                
                if (hapticEnabled) navigator.vibrate([30, 50, 60]);
                startSimulatedTremorSpikes(); // You can replace this with actual hardware triggers later

            } catch (error) {
                console.error("[BLUETOOTH] Connection failed or user cancelled:", error);
                
                // Reset UI on failure
                btnConnect.style.transform = "scale(1)";
                lblConnect.textContent = "Connect";
                iconConnect.className = "ph ph-bluetooth";
                if (hapticEnabled) navigator.vibrate(100);
            }
        } else {
            // Disconnecting Manual
            if (bluetoothDevice && bluetoothDevice.gatt.connected) {
                bluetoothDevice.gatt.disconnect();
            } else {
                handleDisconnect();
            }
        }
    });

    // [OPEN END] Parse and show incoming Bluetooth data in the app
    function handleIncomingData(event) {
        // Read the value (assuming it's a DataView)
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const dataString = decoder.decode(value);
        console.log(`[BLUETOOTH IN]: ${dataString}`);

        // Update UI based on Arduino's serial output
        // Example: If Arduino sends "BATTERY:85" or "TREMOR:HIGH"
        if (dataString.includes('TREMOR')) {
            showSmartToast(); // Trigger your UI alert
        }
        
        // TODO: Update your charts or numbers here based on the values caught
    }

    function handleDisconnect() {
        isConnected = false;
        bluetoothDevice = null;
        bluetoothCharacteristic = null;

        btnConnect.className = "btn-connect disconnected";
        lblConnect.textContent = "Connect";
        iconConnect.className = "ph ph-bluetooth";
        
        dotStatus.classList.remove('active');
        lblStatus.textContent = "Offline (Reconnecting...)";
        lblStatus.className = "status-text offline";
        lblBattery.textContent = "Last known: 85%";
        
        if (hapticEnabled) navigator.vibrate([60, 100, 30]);
        clearTimeout(tremorTimeout);
        console.log("[BLUETOOTH] Disconnected");
    }

    // --- Safety Release (Hold to trigger) with Hardware Open Ends ---
    const btnSafety = document.getElementById('btnSafety');
    const btnSafetyFill = document.getElementById('btnSafetyFill');
    const btnSafetyText = document.getElementById('btnSafetyText');
    const btnSafetyIcon = document.getElementById('btnSafetyIcon');
    let holdTimer;
    let holdProgress = 0;
    let isReleasing = false;
    let haptic1sFired = false;
    let haptic2sFired = false;

    // Prevent context menu on long press
    btnSafety.addEventListener("contextmenu", e => e.preventDefault());

    // Placeholder for Web Bluetooth / Web Serial API Integration
    async function sendBluetoothCommand(command) {
        // [OPEN END] Sending back to Arduino
        console.log(`[HARDWARE SIGNAL] Attempting to send to Arduino: ${command}`);

        if (bluetoothCharacteristic && isConnected) {
            try {
                const encoder = new TextEncoder();
                await bluetoothCharacteristic.writeValue(encoder.encode(command));
                console.log("[BLUETOOTH OUT] Command sent successfully.");
            } catch (err) {
                console.error("[BLUETOOTH OUT] Failed to write to Arduino", err);
            }
        } else {
            console.warn("[BLUETOOTH OUT] Not connected to the hardware. Simulating ACK.");
            // Simulate ack wait if disconnected
            setTimeout(() => {
                console.log("[HARDWARE SIGNAL] ACK:RELEASED received from hardware (Simulated)");
            }, 200);
        }
    }

    function completeRelease() {
        clearInterval(holdTimer);
        isReleasing = false;
        
        // Execute Hardware Protocol
        sendBluetoothCommand("COMMAND:RELEASE\\n");

        if (hapticEnabled) navigator.vibrate([50, 100, 150, 50, 50]); // Success pattern

        btnSafety.classList.remove('holding');
        btnSafety.classList.add('success');
        btnSafetyText.textContent = "Pressure Released ✓";
        btnSafetyIcon.className = "ph-fill ph-check-circle";
        btnSafetyFill.style.width = "100%";

        setTimeout(() => {
            // Reset to ready
            btnSafety.classList.remove('success');
            btnSafetyText.textContent = "Hold to Release Pressure";
            btnSafetyIcon.className = "ph ph-shield-check";
            btnSafetyFill.style.width = "0%";
            btnSafetyFill.style.transition = "none"; // Snap back instantly inside DOM logic, or quickly animated
        }, 2000);
    }

    function startSafetyHold(e) {
        if (e.cancelable) e.preventDefault();
        if (btnSafety.classList.contains('success')) return; // In cooldown
        
        isReleasing = true;
        holdProgress = 0;
        haptic1sFired = false;
        haptic2sFired = false;
        
        btnSafety.classList.add('holding');
        btnSafetyFill.style.transition = "none";
        
        // Text transition logic inside interval
        holdTimer = setInterval(() => {
            holdProgress += Number( (100 / 30).toFixed(2) ); // 30 updates = 3s (100ms per tick)
            
            if (holdProgress >= 33 && !haptic1sFired) {
                if (hapticEnabled) navigator.vibrate(20); // 1s Light
                haptic1sFired = true;
            }
            if (holdProgress >= 66 && !haptic2sFired) {
                if (hapticEnabled) navigator.vibrate(40); // 2s Medium
                haptic2sFired = true;
            }

            if (holdProgress >= 90) {
                btnSafetyText.textContent = "Releasing...";
            }

            if (holdProgress >= 100) {
                completeRelease();
            } else {
                btnSafetyFill.style.width = `${holdProgress}%`;
            }
        }, 100);
    }

    function cancelSafetyHold() {
        if (!isReleasing) return;
        clearInterval(holdTimer);
        isReleasing = false;
        
        if (hapticEnabled) navigator.vibrate(10); // Light tap for abort
        
        btnSafety.classList.remove('holding');
        btnSafetyText.textContent = "Hold to Release Pressure";
        
        // Snap back to 0% with spring-like effect
        btnSafetyFill.style.transition = "width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        btnSafetyFill.style.width = "0%";
    }

    btnSafety.addEventListener('mousedown', startSafetyHold);
    btnSafety.addEventListener('touchstart', startSafetyHold, {passive: false});
    btnSafety.addEventListener('mouseup', cancelSafetyHold);
    btnSafety.addEventListener('mouseleave', cancelSafetyHold);
    btnSafety.addEventListener('touchend', cancelSafetyHold);

    // --- Contextual Smart Suggestions ---
    const smartToast = document.getElementById('smartToast');
    let tremorTimeout;

    function startSimulatedTremorSpikes() {
        if (!isConnected) return;
        
        tremorTimeout = setTimeout(() => {
            if(isConnected) {
                showSmartToast();
                // Haptic Mirror (Simulating the piezo motor pattern during suppression)
                if (hapticEnabled) navigator.vibrate([40, 30, 40, 30, 40, 30, 80]);
            }
            startSimulatedTremorSpikes(); // loop
        }, Math.random() * 10000 + 5000); // 5 to 15s
    }

    function showSmartToast() {
        smartToast.classList.add('show');
        setTimeout(() => {
            smartToast.classList.remove('show');
        }, 5000); // Hide after 5 seconds
    }

    const toastBtns = document.querySelectorAll('.toast-btn');
    toastBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            smartToast.classList.remove('show');
            if (hapticEnabled) navigator.vibrate(20);
        });
    });

    // --- Daily Rings Dashboard Logic ---
    function initDailyRings() {
        // Run staggered animations
        setTimeout(() => {
            // Animate rings
            const outer = document.querySelector('.ring-outer');
            const middle = document.querySelector('.ring-middle');
            const inner = document.querySelector('.ring-inner');
            if(outer) outer.style.strokeDashoffset = 502 - (502 * 0.70); // 70% complete
            if(middle) middle.style.strokeDashoffset = 376 - (376 * 0.80); // 80% complete (12/15)
            if(inner) inner.style.strokeDashoffset = 251 - (251 * 0.95); // 95% complete

            // Animate counters
            const counters = document.querySelectorAll('.counter-anim');
            counters.forEach(counter => {
                const target = parseFloat(counter.getAttribute('data-target'));
                const duration = 1500;
                const increment = target / (duration / 16);
                let current = 0;
                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        counter.innerText = (target % 1 === 0) ? Math.floor(current) : current.toFixed(1);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.innerText = target; // Ensure exact end value
                    }
                };
                updateCounter();
            });
        }, 300); // 300ms delay after load
    }
    initDailyRings();

    // --- Quick Action Cards ---
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            // Simulate saving
            const icon = card.querySelector('i');
            const oldClass = icon.className;
            icon.className = "ph-fill ph-check-circle";
            
            setTimeout(() => {
                icon.className = oldClass;
            }, 1000);
        });
    });

    // --- Timeline Modals & Interactions ---
    
    // --- Mock Data Generator & State ---
    const MOCK_DATA = [];
    let currentFilter = 'All';
    let currentDateView = 'Today';
    let flaggedEventIds = new Set();
    
    // Seed Data
    function generateMockData() {
        const contexts = ['Coffee', 'Water', 'Writing', 'Typing', 'Walking', 'Cooking', 'Resting', 'Reading'];
        const tags = ['Meds', 'Eating', 'Stress', 'Active', 'Sleep'];
        const now = new Date();
        
        let idCounter = 1;

        const addEvents = (count, daysAgo) => {
            const dayBase = new Date(now);
            dayBase.setDate(now.getDate() - daysAgo);

            for(let i=0; i<count; i++) {
                const hour = 6 + Math.floor(Math.random() * 16); // 6am to 10pm
                const minute = Math.floor(Math.random() * 60);
                const eventDate = new Date(dayBase);
                eventDate.setHours(hour, minute, 0, 0);

                const duration = (Math.random() * 4 + 0.5).toFixed(1);
                const intensity = Math.floor(Math.random() * 10) + 1;
                const context = contexts[Math.floor(Math.random() * contexts.length)];
                let tag = tags[Math.floor(Math.random() * tags.length)]; // Usually assigned an activity

                if(hour < 9) tag = 'Sleep'; // simple heuristic
                if(hour >= 11 && hour <= 14 || hour >= 18 && hour <= 20) tag = 'Eating';
                if(intensity > 8) tag = 'Stress';

                MOCK_DATA.push({
                    id: `evt_${idCounter++}`,
                    timestamp: eventDate.getTime(),
                    timeLabel: eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                    duration: parseFloat(duration),
                    intensity: intensity,
                    contextStr: `While ${context.toLowerCase()}`,
                    tag: tag,
                    daysAgo: daysAgo
                });
            }
        };

        addEvents(Math.floor(Math.random()*15 + 5), 0); // Today 5-20
        addEvents(Math.floor(Math.random()*20 + 5), 1); // Yesterday 5-25
        
        // Populate slightly for the rest of the week (days 2-6)
        for(let d=2; d<7; d++) {
            addEvents(Math.floor(Math.random()*8 + 2), d);
        }
        
        // Populate for month (days 7-29)
        for(let d=7; d<30; d++) {
            addEvents(Math.floor(Math.random()*5 + 1), d);
        }
        
        // Sort newest first
        MOCK_DATA.sort((a,b) => b.timestamp - a.timestamp);
    }
    generateMockData();

    // Determine color class from intensity
    function getSeverityProps(intensity) {
        if(intensity >= 8) return { dotClass: 'sev-red', chipClass: 'bg-red-soft', label: 'High' };
        if(intensity >= 4) return { dotClass: 'sev-amber', chipClass: 'bg-amber-soft', label: 'Medium' };
        return { dotClass: 'sev-green', chipClass: 'bg-green-soft', label: 'Low' };
    }
    
    function getTagIcon(tag) {
        const map = {
            'Meds': 'ph-pill',
            'Eating': 'ph-coffee',
            'Stress': 'ph-warning-circle',
            'Active': 'ph-person-simple-walk',
            'Sleep': 'ph-moon-stars'
        };
        return map[tag] || 'ph-activity';
    }

    // Render Timeline & Stats Update
    function renderTimeline() {
        const feed = document.getElementById('timelineFeed');
        if(!feed) return;

        // Clear existing, keep the line
        feed.innerHTML = '<div class="timeline-line"></div>';

        // Filter by Date View
        let filteredSet = MOCK_DATA.filter(evt => {
            if(currentDateView === 'Today') return evt.daysAgo === 0;
            if(currentDateView === 'Yesterday') return evt.daysAgo === 1;
            if(currentDateView === 'Week') return evt.daysAgo < 7;
            if(currentDateView === 'Month') return evt.daysAgo < 30;
            return true;
        });

        // Calculate Stats for Date View
        let activeSec = 0;
        let totalInt = 0;
        let eventCount = filteredSet.length;
        
        // Dictionary for Tag Counting
        let tagCounts = { 'Doctor': 0, 'Meds': 0, 'Eating': 0, 'Stress': 0, 'Active': 0, 'Sleep': 0 };

        filteredSet.forEach(evt => {
            activeSec += evt.duration;
            totalInt += evt.intensity;
            
            if(tagCounts[evt.tag] !== undefined) tagCounts[evt.tag]++;
            if(flaggedEventIds.has(evt.id)) tagCounts['Doctor']++;
        });

        // Update Stat Cards
        document.getElementById('statEvents').innerText = eventCount;
        
        let hrs = Math.floor(activeSec / 3600);
        let mins = Math.floor((activeSec % 3600) / 60);
        let activeTimeStr = "";
        if (hrs > 0) activeTimeStr += `${hrs}h `;
        if (mins > 0 || hrs === 0) activeTimeStr += `${mins}m`;
        document.getElementById('statActiveTime').innerText = activeTimeStr;

        let avgInt = eventCount > 0 ? totalInt / eventCount : 0;
        let avgProps = getSeverityProps(avgInt);
        const avgSevCard = document.getElementById('statAvgSeverity');
        if(eventCount === 0) {
            avgSevCard.innerText = 'None';
            avgSevCard.style.color = '#9ca3af';
            document.getElementById('statSeverityColor').style.background = '#9ca3af';
        } else {
            avgSevCard.innerText = avgProps.label;
            avgSevCard.style.color = (avgProps.label === 'High') ? '#EF4444' : ((avgProps.label === 'Medium') ? '#F59E0B' : '#10B981');
            document.getElementById('statSeverityColor').style.background = (avgProps.label === 'High') ? '#EF4444' : ((avgProps.label === 'Medium') ? '#F59E0B' : '#10B981');
        }

        // Apply Context Filter
        if(currentFilter !== 'All') {
            filteredSet = filteredSet.filter(evt => {
                if(currentFilter === 'Doctor') return flaggedEventIds.has(evt.id);
                return evt.tag === currentFilter;
            });
        }
        
        // Update Pill Counts
        document.querySelectorAll('.filter-pill').forEach(pill => {
            const pillTag = pill.getAttribute('data-filter');
            if(pillTag === 'All') return;
            const countSpan = pill.querySelector('.count');
            if(countSpan && tagCounts[pillTag] !== undefined) {
                countSpan.innerText = tagCounts[pillTag];
            }
        });

        // Insights Toggling
        const weeklyInsight = document.getElementById('weeklyInsight');
        if(weeklyInsight) {
            if(currentDateView === 'Week' || currentDateView === 'Month') {
                weeklyInsight.style.display = 'flex';
            } else {
                weeklyInsight.style.display = 'none';
            }
        }

        // Render Cards
        if(filteredSet.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.padding = '40px 0';
            emptyState.style.textAlign = 'center';
            emptyState.style.color = 'var(--text-secondary)';
            emptyState.innerHTML = `<i class="ph ph-check-circle" style="font-size: 32px; color: #10B981; margin-bottom: 8px;"></i><br>No events in this view.`;
            feed.appendChild(emptyState);
            return;
        }

        let delayMs = 50;
        filteredSet.forEach(evt => {
            const props = getSeverityProps(evt.intensity);
            const isFlagged = flaggedEventIds.has(evt.id);
            const iconClass = getTagIcon(evt.tag);

            const el = document.createElement('div');
            el.className = `timeline-event animate-slide-up ${isFlagged ? 'flagged' : ''}`;
            el.id = `timeline_${evt.id}`;
            el.style.animationDelay = `${delayMs}ms`;
            delayMs += 50;
            
            // Re-bind click locally since we construct DOM here
            el.onclick = () => window.openEventDetail(evt.id, evt);

            el.innerHTML = `
                <div class="event-time">${evt.timeLabel}</div>
                <div class="event-dot ${props.dotClass}"></div>
                <div class="event-card glass" style="position: relative;">
                    <i class="ph-fill ph-star star-badge" style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%);"></i>
                    <div class="ec-header">
                        <div class="ec-title"><i class="ph ${iconClass}"></i> Tremor suppressed</div>
                    </div>
                    <div class="ec-meta">
                        <span class="chip bg-gray">${evt.duration}s duration</span>
                        <span class="chip ${props.chipClass}">Intensity ${evt.intensity}/10</span>
                    </div>
                    ${evt.contextStr ? `<div class="ec-note">"${evt.contextStr}"</div>` : ''}
                </div>
            `;
            feed.appendChild(el);
        });
    }

    // Date Switch listeners
    document.querySelectorAll('.date-pill').forEach(pill => {
        pill.addEventListener('click', () => {
             // Let the horizontal scrolling logic handle 'active' class via existing toggler
             setTimeout(() => {
                 currentDateView = pill.getAttribute('data-date');
                 renderTimeline();
             }, 10);
        });
    });

    // Filter Switch listeners
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
             // Let logic handle 'active' class
             setTimeout(() => {
                 currentFilter = pill.getAttribute('data-filter');
                 renderTimeline();
             }, 10);
        });
    });

    // Initialize View
    renderTimeline();

    // Override openEventDetail
    window.openEventDetail = function(eventId, evtData = null) {
        currentEventId = eventId;
        if (hapticEnabled) navigator.vibrate(15);
        document.getElementById('eventModalOverlay').classList.add('show');
        document.getElementById('eventModalSheet').classList.add('show');
        
        isEventFlagged = flaggedEventIds.has(eventId);
        if(isEventFlagged) {
            document.getElementById('iconDoctorStar').className = 'ph-fill ph-star icon-amber';
            document.getElementById('textMarkDoctor').textContent = "Marked for Review";
            document.getElementById('textMarkDoctor').classList.add('text-amber');
        } else {
            document.getElementById('iconDoctorStar').className = 'ph ph-star icon-gray';
            document.getElementById('textMarkDoctor').textContent = "Mark for Doctor";
            document.getElementById('textMarkDoctor').classList.remove('text-amber');
        }

        // Update modal info based on dynamic data
        if(evtData) {
            currentContext = { tag: evtData.tag, icon: getTagIcon(evtData.tag).replace('ph-','') };
            // Update modal headers as an extended feature
        }

        const trace = document.querySelector('.waveform-anim');
        if (trace) {
            trace.style.animation = 'none';
            trace.offsetHeight; 
            trace.style.animation = null; 
        }
    };
    
    // Override MarkDoctor click
    if(btnMarkDoctor) {
        // Remove old listener and add new
        const newBtnMarkDoctor = btnMarkDoctor.cloneNode(true);
        btnMarkDoctor.parentNode.replaceChild(newBtnMarkDoctor, btnMarkDoctor);
        
        newBtnMarkDoctor.addEventListener('click', () => {
            isEventFlagged = !isEventFlagged;
            if(isEventFlagged) {
                if(hapticEnabled) navigator.vibrate([20, 30, 20]);
                document.getElementById('iconDoctorStar').className = 'ph-fill ph-star icon-amber';
                document.getElementById('textMarkDoctor').textContent = "Marked for Review";
                document.getElementById('textMarkDoctor').classList.add('text-amber');
                flaggedEventIds.add(currentEventId);
            } else {
                if(hapticEnabled) navigator.vibrate(15);
                document.getElementById('iconDoctorStar').className = 'ph ph-star icon-gray';
                document.getElementById('textMarkDoctor').textContent = "Mark for Doctor";
                document.getElementById('textMarkDoctor').classList.remove('text-amber');
                flaggedEventIds.delete(currentEventId);
            }
            renderTimeline(); // re-render to update pills and badges
        });
    }

    // Handle horizontal active states (Date Nav & Filter Nav)
    const toggleActivePills = (selector) => {
        const pills = document.querySelectorAll(selector);
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                if (hapticEnabled) navigator.vibrate(10);
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            });
        });
    }
    toggleActivePills('.date-pill');
    toggleActivePills('.filter-pill');

    // --- Restored Modal Handlers & Actions ---
    const btnEditContext = document.getElementById('btnEditContext');
    const editContextOverlay = document.getElementById('editContextOverlay');
    const editContextSheet = document.getElementById('editContextSheet');

    let currentContext = { tag: 'Eating', icon: '☕' };

    if(btnEditContext) {
        btnEditContext.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            document.querySelectorAll('.context-card').forEach(card => card.classList.remove('active-ctx'));
            const cards = document.querySelectorAll('.context-card');
            cards.forEach(c => {
                if(c.getAttribute('data-context') === (currentContext ? currentContext.tag : '')) c.classList.add('active-ctx');
            });
            editContextOverlay.classList.add('show');
            editContextSheet.classList.add('show');
        });
    }

    const contextCards = document.querySelectorAll('.context-card');
    const voiceInputSection = document.getElementById('voiceInputSection');
    const btnHoldVoice = document.getElementById('btnHoldVoice');
    const voiceResult = document.getElementById('voiceResult');
    let voiceTimer;

    contextCards.forEach(card => {
        card.addEventListener('click', () => {
            const contextTag = card.getAttribute('data-context');
            if(contextTag === 'Other') {
                if (hapticEnabled) navigator.vibrate(15);
                contextCards.forEach(c => c.classList.remove('active-ctx'));
                card.classList.add('active-ctx');
                voiceInputSection.style.display = 'block';
            } else {
                if (hapticEnabled) navigator.vibrate([20, 30, 20]); // success pop
                contextCards.forEach(c => c.classList.remove('active-ctx'));
                card.classList.add('active-ctx');
                voiceInputSection.style.display = 'none';

                if(contextTag !== 'Remove') {
                    currentContext = { tag: contextTag, icon: card.getAttribute('data-icon') };
                }

                setTimeout(() => {
                    editContextOverlay.classList.remove('show');
                    editContextSheet.classList.remove('show');
                    
                    const smartToast = document.getElementById('smartToast');
                    smartToast.querySelector('.toast-content').innerHTML = `<strong>Context Updated</strong>`;
                    smartToast.classList.add('show');
                    setTimeout(() => smartToast.classList.remove('show'), 3000);
                }, 300);
            }
        });
    });

    if(btnHoldVoice) {
        const startVoice = (e) => {
            e.preventDefault();
            if (hapticEnabled) navigator.vibrate(20);
            btnHoldVoice.classList.add('voice-active');
            voiceResult.textContent = "Listening...";
            voiceTimer = setTimeout(() => {
                voiceResult.textContent = "Notes added from voice: It felt like a sharp spasm while lifting my cup.";
                if (hapticEnabled) navigator.vibrate(40);
            }, 1500);
        };
        const stopVoice = (e) => {
            e.preventDefault();
            btnHoldVoice.classList.remove('voice-active');
            if(!voiceResult.textContent.includes('Notes added')) {
                 clearTimeout(voiceTimer);
                 voiceResult.textContent = "Voice input cancelled.";
            } else {
                 setTimeout(() => {
                    editContextOverlay.classList.remove('show');
                    editContextSheet.classList.remove('show');
                    document.querySelector('#smartToast .toast-content').innerHTML = `<strong>Notes Saved</strong>`;
                    document.getElementById('smartToast').classList.add('show');
                    setTimeout(() => document.getElementById('smartToast').classList.remove('show'), 3000);
                 }, 800);
            }
        };
        btnHoldVoice.addEventListener('mousedown', startVoice);
        btnHoldVoice.addEventListener('mouseup', stopVoice);
        btnHoldVoice.addEventListener('mouseleave', stopVoice);
        btnHoldVoice.addEventListener('touchstart', startVoice);
        btnHoldVoice.addEventListener('touchend', stopVoice);
    }

    const btnShareEvent = document.getElementById('btnShareEvent');
    if(btnShareEvent) {
        btnShareEvent.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            const shareData = {
                title: 'Aura-Sleeve Event Report',
                text: `Aura-Sleeve Event Report\nTime: Today\nContext: ${currentContext ? currentContext.tag : ''}\nStatus: Successfully Stabilized\n\n---\nGenerated by Aura-Sleeve Patient Interface`
            };
            if (navigator.share) {
                navigator.share(shareData).catch(console.error);
            } else {
                console.log("NavShare not supported:", shareData.text);
                document.querySelector('#smartToast .toast-content').innerHTML = `<strong>Copied to clipboard</strong>`;
                document.getElementById('smartToast').classList.add('show');
                setTimeout(() => document.getElementById('smartToast').classList.remove('show'), 3000);
            }
        });
    }

    function openExportSheet() {
        if (hapticEnabled) navigator.vibrate(15);
        document.getElementById('exportModalOverlay').classList.add('show');
        document.getElementById('exportModalSheet').classList.add('show');
    }
    
    document.getElementById('btnExportLogs')?.addEventListener('click', openExportSheet);
    document.getElementById('btnExportReport')?.addEventListener('click', openExportSheet);

    // --- Profile System ---
    const btnUserProfile = document.getElementById('btnUserProfile');
    if (btnUserProfile) {
        btnUserProfile.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            
            // Load data from localStorage
            const saved = localStorage.getItem('auraPatientData');
            if (saved) {
                const data = JSON.parse(saved);
                document.getElementById('profNameTitle').textContent = data.name || 'Unknown Patient';
                document.getElementById('profJoinDate').textContent = data.joinedDate ? `Patient since ${data.joinedDate}` : 'Patient since --';
                document.getElementById('profCondition').textContent = data.condition || 'Not specified';
                document.getElementById('profAge').textContent = data.age || '--';
                document.getElementById('profBlood').textContent = data.blood || '--';
                document.getElementById('profDoctor').textContent = data.doctor || '--';
            } else {
                document.getElementById('profNameTitle').textContent = 'Guest User';
                document.getElementById('profCondition').textContent = 'No data';
            }

            document.getElementById('profileModalOverlay').classList.add('show');
            document.getElementById('profileModalSheet').classList.add('show');
        });
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate([20, 50]);
            // Return to landing page
            window.location.href = 'web.html';
        });
    }

    const btnCloseModals = document.querySelectorAll('.btnCloseModal');
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    
    function closeAllModals() {
        if (hapticEnabled) navigator.vibrate(10);
        document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.bottom-sheet').forEach(el => el.classList.remove('show'));
    }

    btnCloseModals.forEach(btn => btn.addEventListener('click', closeAllModals));
    modalOverlays.forEach(overlay => overlay.addEventListener('click', closeAllModals));

    // --- Export Logic ---
    const btnExportPDF = document.getElementById('btnExportPDF');
    const btnExportCSV = document.getElementById('btnExportCSV');
    const btnExportImage = document.getElementById('btnExportImage');

    function getFilteredExportData() {
        return MOCK_DATA.filter(evt => {
            // Apply current date view constraint
            if(currentDateView === 'Today' && evt.daysAgo !== 0) return false;
            if(currentDateView === 'Yesterday' && evt.daysAgo !== 1) return false;
            if(currentDateView === 'Week' && evt.daysAgo >= 7) return false;
            if(currentDateView === 'Month' && evt.daysAgo >= 30) return false;
            // Apply current tag constraint
            if(currentFilter !== 'All') {
                if(currentFilter === 'Doctor' && !flaggedEventIds.has(evt.id)) return false;
                if(currentFilter !== 'Doctor' && evt.tag !== currentFilter) return false;
            }
            return true;
        });
    }

    if(btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(15);
            const dataToExport = getFilteredExportData();
            
            // CSV Header
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Date,Time,Duration (s),Intensity (1-10),Context,Tag,Flagged\n";
            
            // CSV Rows
            dataToExport.forEach(evt => {
                let d = new Date(evt.timestamp);
                let dateStr = d.toLocaleDateString();
                let flagged = flaggedEventIds.has(evt.id) ? "Yes" : "No";
                let row = `"${dateStr}","${evt.timeLabel}",${evt.duration},${evt.intensity},"${evt.contextStr}","${evt.tag}",${flagged}`;
                csvContent += row + "\r\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `aura_logs_${currentDateView.toLowerCase()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            closeAllModals();
        });
    }

    if(btnExportPDF) {
        btnExportPDF.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate([30, 50]);
            btnExportPDF.innerHTML = '<i class="ph ph-spinner-gap ph-spin" style="color: #EF4444;"></i> Generating...';
            
            setTimeout(() => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                const dataToExport = getFilteredExportData();
                
                // Add header
                doc.setFontSize(20);
                doc.setTextColor(30, 41, 59);
                doc.text("Aura-Sleeve Medical Report", 14, 22);
                
                doc.setFontSize(12);
                doc.setTextColor(100, 116, 139);
                doc.text(`Filter: ${currentDateView} - ${currentFilter}`, 14, 30);
                doc.text(`Total Events: ${dataToExport.length}`, 14, 36);
                
                // Average Calculation for Summary
                let totalIntensity = 0;
                let totalDuration = 0;
                dataToExport.forEach(e => {
                    totalIntensity += e.intensity;
                    totalDuration += e.duration;
                });
                let avgInt = dataToExport.length ? (totalIntensity/dataToExport.length).toFixed(1) : 0;
                let avgDur = dataToExport.length ? (totalDuration/dataToExport.length).toFixed(1) : 0;
                
                doc.text(`Average Intensity: ${avgInt}/10`, 100, 30);
                doc.text(`Average Duration: ${avgDur}s`, 100, 36);

                const tableData = dataToExport.map(evt => {
                    let d = new Date(evt.timestamp);
                    let flagged = flaggedEventIds.has(evt.id) ? "*" : "";
                    return [
                        d.toLocaleDateString() + ' ' + evt.timeLabel,
                        evt.duration + 's',
                        evt.intensity + '/10',
                        evt.tag,
                        evt.contextStr,
                        flagged
                    ];
                });

                doc.autoTable({
                    startY: 45,
                    head: [['Date/Time', 'Duration', 'Intensity', 'Tag', 'User Context', 'Doctor Review']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [15, 23, 42] },
                    styles: { fontSize: 10, cellPadding: 3 }
                });

                doc.save(`Aura_Report_${currentDateView}.pdf`);
                
                btnExportPDF.innerHTML = '<i class="ph ph-file-pdf" style="color: #EF4444;"></i> Send to Doctor (PDF)';
                closeAllModals();
            }, 500); // Simulate processing time
        });
    }
    
    if(btnExportImage) {
        btnExportImage.addEventListener('click', () => {
             document.querySelector('#smartToast .toast-content').innerHTML = `<strong>Image saved to gallery</strong>`;
             document.getElementById('smartToast').classList.add('show');
             setTimeout(() => document.getElementById('smartToast').classList.remove('show'), 3000);
             closeAllModals();
        });
    }

    // --- Aura Physics Lab Simulation ---
    const canvas = document.getElementById('physicsCanvas');
    const ctx = canvas.getContext('2d');
    
    // Internal resolution for crisp rendering
    const cw = 800;
    const ch = 800;
    
    let simState = 'idle'; // idle, tremor, suppressing, resolved
    let simTime = 0;
    let xrayMode = false;
    let targetPressure = 12;
    let currentPressure = 12;
    let dampeningRatio = 0;
    let responseTime = 0;
    
    // UI Elements
    const btnDemo = document.getElementById('btnTriggerDemo');
    const btnXray = document.getElementById('btnToggleXray');
    const lblPressure = document.getElementById('valPressure');
    const lblDampening = document.getElementById('valDampening');
    const lblResponse = document.getElementById('valResponse');
    const lblStatusText = document.getElementById('labStatusText');
    const ctxSection = document.getElementById('labContextSection');

    // Controls
    btnXray.addEventListener('click', () => {
        if (hapticEnabled) navigator.vibrate(15);
        xrayMode = !xrayMode;
        btnXray.classList.toggle('active');
    });

    btnDemo.addEventListener('click', () => {
        if (simState !== 'idle' && simState !== 'resolved') return;
        if (hapticEnabled) navigator.vibrate(30);
        startSimulationSequence();
    });

    // Context Logs
    document.querySelectorAll('.lab-ctx-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (hapticEnabled) navigator.vibrate(20);
            btn.classList.add('selected');
            setTimeout(() => {
                btn.classList.remove('selected');
                ctxSection.classList.remove('show');
                if(simState === 'resolved') {
                    resetSimulation();
                }
            }, 500);
        });
    });

    function startSimulationSequence() {
        simState = 'tremor';
        lblStatusText.textContent = "Detecting Involuntary Movement";
        lblStatusText.style.color = "#F59E0B";
        
        ctxSection.classList.remove('show');
        
        // Response time calculation simulation
        let rTime = 0;
        let rInterval = setInterval(() => { rTime += 12; lblResponse.textContent = rTime; }, 20);
        
        setTimeout(() => {
            clearInterval(rInterval);
            lblResponse.textContent = "214";
            
            simState = 'suppressing';
            lblStatusText.textContent = "Active Suppression";
            lblStatusText.style.color = "#10B981";
            targetPressure = 28;
            if (hapticEnabled) navigator.vibrate([40, 30, 40, 30, 60]);
            
            setTimeout(() => {
                simState = 'resolved';
                lblStatusText.textContent = "Tremor Suppressed";
                ctxSection.classList.add('show');
                targetPressure = 16;
                if (hapticEnabled) navigator.vibrate([100, 50, 100]);
            }, 2500);
            
        }, 800); // 800ms of simulated onset
    }

    function resetSimulation() {
        simState = 'idle';
        lblStatusText.textContent = "Monitoring Baseline";
        lblStatusText.style.color = "#94A3B8";
        targetPressure = 12;
        dampeningRatio = 0;
        lblResponse.textContent = "--";
    }

    function drawWaveform(yOffset, amplitude, frequency, color, phase, progress) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for(let x = 100; x < cw - 100; x += 2) {
            // Apply a fade in/out at the edges of the waveform
            let edgeFade = 1;
            if (x < 200) edgeFade = (x - 100) / 100;
            if (x > cw - 200) edgeFade = (cw - 100 - x) / 100;
            
            // Random noise added to wave
            let noise = (Math.random() - 0.5) * (amplitude * 0.2);
            let y = yOffset + Math.sin((x * frequency) + phase) * (amplitude * progress * edgeFade) + noise;
            
            if(x === 100) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    function drawHexagon(x, y, r, p) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let angle = (Math.PI / 3) * i;
            let hx = x + (r - p) * Math.cos(angle);
            let hy = y + (r - p) * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
    }

    function renderLoop() {
        simTime += 0.05;
        
        // Smooth transitions
        currentPressure += (targetPressure - currentPressure) * 0.1;
        
        let targetDampening = 0;
        if(simState === 'suppressing') targetDampening = 84;
        if(simState === 'resolved') targetDampening = 92;
        dampeningRatio += (targetDampening - dampeningRatio) * 0.1;

        lblPressure.textContent = Math.round(currentPressure);
        lblDampening.textContent = Math.round(dampeningRatio);
        
        // Update pressure color 
        if (currentPressure > 24) lblPressure.style.color = "#F43F5E";
        else if (currentPressure > 16) lblPressure.style.color = "#F59E0B";
        else lblPressure.style.color = "#10B981";

        ctx.clearRect(0, 0, cw, ch);
        
        // 1. Draw Sleeve Representation (Middle area)
        let sleeveCenterY = 360;
        
        // X-Ray Bone/Arm
        if (xrayMode) {
            ctx.fillStyle = "rgba(255, 228, 204, 0.1)"; // Flesh tone
            ctx.beginPath(); ctx.arc(cw/2, sleeveCenterY, 120, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = "rgba(226, 232, 240, 0.4)"; // Bone
            ctx.beginPath(); ctx.arc(cw/2, sleeveCenterY, 30, 0, Math.PI*2); ctx.fill();
        }

        // Draw Auxetic Mesh
        let cols = 9; let rows = 5;
        let hexR = 30;
        let hexSpaceX = hexR * 1.5;
        let hexSpaceY = hexR * Math.sqrt(3);
        let startX = cw/2 - ((cols-1) * hexSpaceX)/2;
        let startY = sleeveCenterY - ((rows-1) * hexSpaceY)/2;

        ctx.lineWidth = 2;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let x = startX + c * hexSpaceX;
                let y = startY + r * hexSpaceY;
                if (c % 2 !== 0) y += hexSpaceY/2;
                
                // Distance to center for radial inflation effect
                let dist = Math.sqrt(Math.pow(x - cw/2, 2) + Math.pow(y - sleeveCenterY, 2));
                // Pressure logic
                let localPressure = Math.max(0, currentPressure - (dist/10) );
                
                if (xrayMode) {
                    ctx.strokeStyle = `rgba(16, 185, 129, ${0.2 + (localPressure/60)})`;
                    ctx.fillStyle = `rgba(16, 185, 129, ${(localPressure/80)})`;
                    drawHexagon(x, y, hexR, localPressure * 0.4);
                    ctx.stroke();
                    if(localPressure > 5) ctx.fill();
                } else {
                    // Solid sleeve look
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + localPressure/100})`;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + localPressure/100})`;
                    drawHexagon(x, y, hexR, localPressure * 0.2);
                    ctx.fill(); ctx.stroke();
                }
            }
        }
        
        // 2. Waveforms (Bottom area)
        let waveY = 650;
        
        // Base grid for medical feel
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 1;
        for(let i=0; i<cw; i+=40) { ctx.beginPath(); ctx.moveTo(i, waveY-80); ctx.lineTo(i, waveY+80); ctx.stroke(); }
        for(let i=waveY-80; i<=waveY+80; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(cw, i); ctx.stroke(); }

        let tremorAmp = 5;
        let tremorFreq = 0.05;
        
        if (simState === 'tremor') { tremorAmp = 60; tremorFreq = 0.15; }
        else if (simState === 'suppressing') { tremorAmp = 40; tremorFreq = 0.12; }
        else if (simState === 'resolved') { tremorAmp = 10; tremorFreq = 0.08; }

        let rawPhase = -simTime * 3;
        let stabilizedAmp = tremorAmp * (1 - dampeningRatio/100);

        // Render Raw Red Wave (Input)
        ctx.globalAlpha = 0.5;
        // In idle it's calm, in tremor it jumps
        drawWaveform(waveY, tremorAmp, tremorFreq, "#F43F5E", rawPhase, 1);
        
        ctx.globalAlpha = 1;
        // Render Green Wave (Output)
        drawWaveform(waveY, stabilizedAmp, tremorFreq, "#10B981", rawPhase - 0.5, 1);

        requestAnimationFrame(renderLoop);
    }

    // Start Canvas Loop
    renderLoop();

});
