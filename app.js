// app.js

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadUserData();
    initAppointments();
    initChat(); 
    registerServiceWorker();
});

let currentChatKey = 'verwaltung';
let chatData = {}; // { verwaltung: [messages], arzt: [...], fahrer: [...] }

function saveChats() {
    localStorage.setItem('rehaChats', JSON.stringify(chatData));
}

function loadChats() {
    const stored = localStorage.getItem('rehaChats');
    if (stored) {
        chatData = JSON.parse(stored);
    } else {
        chatData = {};
    }
    // Standard-Chats sicherstellen
    ['verwaltung', 'arzt', 'fahrer'].forEach(key => {
        if (!chatData[key]) chatData[key] = [];
    });
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function initChat() {
    loadChats();

    const chatButtons = document.querySelectorAll('.contact-btn');
    const messagesContainer = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-message-input');
    const downloadBtn = document.getElementById('chat-download-btn');

    // Aktuellen Chat aus aktivem Button bestimmen
    const activeBtn = document.querySelector('.contact-btn.active');
    if (activeBtn && activeBtn.dataset.contact) {
        currentChatKey = activeBtn.dataset.contact;
    }

    // Nachrichten für aktuellen Chat anzeigen
    renderChat(currentChatKey);

    // Kontaktwechsel: anderen Chat laden
    chatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            chatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const contactKey = btn.dataset.contact;
            if (!chatData[contactKey]) chatData[contactKey] = [];
            currentChatKey = contactKey;
            renderChat(currentChatKey);
        });
    });

    // Nachricht senden
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            const msg = {
                id: Date.now(),
                from: 'user',
                text: text,
                timestamp: new Date().toISOString()
            };

            chatData[currentChatKey].push(msg);
            saveChats();
            renderChat(currentChatKey);
            chatInput.value = '';
        });
    }

    // JSON-Export für aktuellen Chat
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            exportChatAsJson(currentChatKey);
        });
    }
}

function renderChat(contactKey) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messages = chatData[contactKey] || [];

    if (messages.length === 0) {
        messagesContainer.innerHTML = `<p style="color:#6B7280;">Noch keine Nachrichten. Schreiben Sie eine erste Nachricht.</p>`;
        return;
    }

    messagesContainer.innerHTML = messages.map(m => {
        const timeStr = new Date(m.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const cls = m.from === 'user' ? 'from-user' : 'from-contact';
        return `
            <div class="chat-message ${cls}">
                <div class="chat-bubble">${escapeHtml(m.text)}</div>
                <span class="chat-time">${timeStr}</span>
            </div>
        `;
    }).join('');

    // Immer nach unten scrollen
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function exportChatAsJson(contactKey) {
    const data = chatData[contactKey] || [];
    const jsonStr = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${contactKey}.json`; // z.B. chat-verwaltung.json
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Navigation Logic
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .fab-btn');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Button Styling Update (nur für normale Nav Items)
            if (item.classList.contains('nav-item')) {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }

            // View Switching
            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');

                if (view.id === targetId) {
                    view.classList.remove('hidden');
                    view.classList.add('active');
                }
            });
        });
    });
}

// Data Handling (Offline First Approach)
function loadUserData() {
    // Simulierte Daten
    const userData = {
        name: "Hans",
        diagnosis: "Hüft-TEP rechts",
        nextAppt: "09:00 Uhr",
        room: "Raum 104"
    };

    // 1. Versuchen, Daten aus localStorage zu laden (Offline Fall)
    const storedData = localStorage.getItem('rehaUser');
    if (storedData) {
        renderData(JSON.parse(storedData));
        console.log('Daten aus Cache geladen');
    } else {
        // Initial rendern
        renderData(userData);
        saveDataLocally(userData);
    }

    // In einer echten App würde hier ein Fetch zum Server passieren
    // und bei Erfolg der localStorage aktualisiert werden.
}

function renderData(data) {
    // Hier würden wir normalerweise das DOM manipulieren, 
    // um "Hans" oder die Uhrzeit dynamisch einzusetzen.
    // Da es hardcoded im HTML ist, ist dies nur ein Platzhalter für die Logik.
}

function saveDataLocally(data) {
    localStorage.setItem('rehaUser', JSON.stringify(data));
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registriert: ', registration.scope);
                })
                .catch(err => {
                    console.log('SW Registrierung fehlgeschlagen: ', err);
                });
        });
    }
}

// Appointment System
function initAppointments() {
    const uploadInput = document.getElementById('pdf-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', handlePDFUpload);
    }
    loadAppointments();
}

function loadAppointments() {
    const storedAppts = localStorage.getItem('rehaAppts');
    if (storedAppts) {
        renderAppointments(JSON.parse(storedAppts));
    }
}

// Progress Bar Functions
function showProgressBar() {
    document.getElementById('progress-container').style.display = 'flex';
    updateProgressBar(0, 'Datei wird geladen...');
}

function hideProgressBar() {
    document.getElementById('progress-container').style.display = 'none';
}

function updateProgressBar(percent, statusText) {
    const fill = document.getElementById('progress-bar-fill');
    const percentText = document.getElementById('progress-percent');
    const status = document.getElementById('progress-status');
    
    fill.style.width = percent + '%';
    percentText.textContent = Math.round(percent) + '%';
    status.textContent = statusText;
}


async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Bitte wählen Sie eine PDF-Datei aus.');
        return;
    }

    // PROGRESS BAR START
    showProgressBar();
    updateProgressBar(5, 'PDF wird initialisiert...');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        const totalPages = pdf.numPages;
        let currentPage = 0;

        updateProgressBar(10, `Verarbeite ${totalPages} Seiten...`);

        // Seitenverarbeitung mit Fortschritt
        for (let i = 1; i <= totalPages; i++) {
            currentPage = i;
            const pageProgress = (currentPage / totalPages) * 80 + 10; // 10% - 90%
            
            updateProgressBar(pageProgress, `Seite ${i} von ${totalPages} wird analysiert...`);

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Prüfen, ob Seite Text oder Bild ist
            if (textContent.items.length < 5) {
                updateProgressBar(pageProgress, `Seite ${i}: OCR wird durchgeführt...`);
                
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // OCR mit Fortschritts-Callback
                const { data: { text } } = await Tesseract.recognize(canvas, 'deu', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const ocrProgress = (currentPage - 1 + m.progress) / totalPages * 80 + 10;
                            updateProgressBar(ocrProgress, `Seite ${i}: OCR ${Math.round(m.progress * 100)}%`);
                        }
                    }
                });
                fullText += text + '\n';
            } else {
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
        }

        updateProgressBar(95, 'Termine werden erstellt...');
        
        console.log("Extrahierter Text:", fullText);
        const newAppointments = parseSmartAppointments(fullText);

        if (newAppointments.length > 0) {
            saveAppointments(newAppointments);
            renderAppointments(newAppointments);
            updateProgressBar(100, 'Fertig!');
            
            // Kurz anzeigen, dann ausblenden
            setTimeout(() => {
                hideProgressBar();
                alert(`${newAppointments.length} Termine erfolgreich importiert!`);
            }, 800);
        } else {
            hideProgressBar();
            alert('Keine Termine gefunden. Bitte prüfen Sie die Qualität des Scans.');
        }

    } catch (error) {
        console.error('Fehler beim PDF-Import:', error);
        hideProgressBar();
        alert('Fehler beim Lesen der PDF-Datei: ' + error.message);
    } finally {
        // Input zurücksetzen, damit dieselbe Datei erneut ausgewählt werden kann
        event.target.value = '';
    }
}

function parseSmartAppointments(text) {
    const appointments = [];
    const lines = text.split('\n');

    let currentDate = null;

    // Regex für Datums-Block (z.B. "Montag 30.06.2025" oder nur "30.06.2025")
    // Wir suchen nach einem Datum am Anfang oder Ende einer Zeile, oft mit Wochentag davor
    const dateBlockRegex = /(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)?.*(\d{2}\.\d{2}\.\d{4})/;

    // Regex für Zeilenstart mit Zeit (HH:MM)
    // Erwartet, dass die Zeile mit der Uhrzeit beginnt
    const timeRowRegex = /^\s*(\d{1,2}:\d{2})(?:\s*(?:-|bis)\s*(\d{1,2}:\d{2}))?/;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 1. Prüfen auf Datums-Block
        const dateMatch = line.match(dateBlockRegex);
        if (dateMatch) {
            // Wenn wir ein Datum finden, setzen wir den "currentDate" Kontext
            // Aber Vorsicht: Manchmal steht ein Datum auch im Footer/Header.
            // Wir nehmen an, dass ein Datums-Block "wichtig" aussieht oder allein steht.
            // Fürs erste nehmen wir jedes gefundene Datum als neuen Blockstart.
            currentDate = dateMatch[1];
            console.log("Neuer Datums-Block gefunden:", currentDate);
            continue;
        }

        // 2. Prüfen auf Termin-Zeile (nur wenn wir ein Datum haben)
        if (currentDate) {
            const timeMatch = line.match(timeRowRegex);
            if (timeMatch) {
                const startTime = timeMatch[1];
                const endTime = timeMatch[2] || "";
                const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;

                // Rest der Zeile analysieren
                // Wir entfernen die Zeit vom Anfang
                let restText = line.replace(timeRowRegex, '').trim();

                // Smart Extraction aus dem Rest-Text
                let location = "Raum unbekannt";
                let therapist = "Mitarbeiter unbekannt";
                let title = "Termin"; // Fallback

                // Strategie: Wir suchen bekannte Muster und "schneiden" sie raus oder identifizieren sie.

                // A. Mitarbeiter (Hr. / Fr. / Dr.)
                const therapMatch = restText.match(/(?:Hr\.|Fr\.|Dr\.|Therapeut)\s+([A-ZÄÖÜ][a-zäöü]+(?:-[A-ZÄÖÜ][a-zäöü]+)?)/);
                if (therapMatch) {
                    therapist = therapMatch[0];
                    // Optional: Entfernen aus restText, um Titel besser zu finden?
                    // restText = restText.replace(therapMatch[0], ''); 
                }

                // B. Ort (Raum X)
                const locMatch = restText.match(/(?:Raum|Zimmer|Etage|Haus)\s*(\d+[a-zA-Z]*)/i);
                if (locMatch) {
                    location = locMatch[0];
                }

                // C. Leistung / Titel
                // Alles was nicht Zeit, Ort oder Mitarbeiter ist, ist wahrscheinlich die Leistung.
                // Wir nutzen wieder unsere Keyword-Liste, um den "Kern" der Leistung zu finden.
                const therapies = ["Physio", "Ergo", "Massage", "Lymphdrainage", "KG", "MT", "Krankengymnastik", "Einzel", "Gruppe", "Fango", "Heißluft"];
                let foundTherapy = [];
                for (const t of therapies) {
                    if (restText.toLowerCase().includes(t.toLowerCase())) {
                        // Wir mappen Abkürzungen auf Langformen
                        let fullTitle = t;
                        if (t === "KG") fullTitle = "Krankengymnastik";
                        if (t === "MT") fullTitle = "Manuelle Therapie";
                        foundTherapy.push(fullTitle);
                    }
                }

                if (foundTherapy.length > 0) {
                    // Wir nehmen die gefundenen Begriffe als Titel (z.B. "Krankengymnastik Einzel")
                    // Duplikate entfernen
                    title = [...new Set(foundTherapy)].join(' ');
                } else {
                    // Fallback: Wenn wir keine Keywords finden, nehmen wir den Text zwischen Zeit und (Ort/Mitarbeiter)
                    // Das ist etwas riskant, aber besser als "Termin".
                    // Wir nehmen einfach die ersten 3 Wörter des Resttextes als Titel.
                    const words = restText.split(/\s+/);
                    title = words.slice(0, 3).join(' ');
                }

                // Details (Mitbringen)
                let details = "";
                if (restText.toLowerCase().includes("handtuch")) details += "Handtuch ";
                if (restText.toLowerCase().includes("laken")) details += "Laken ";
                if (details === "") details = "Bitte pünktlich erscheinen.";

                // Termin hinzufügen
                // Duplikate Check (Datum + Startzeit)
                const isDuplicate = appointments.some(a => a.date === currentDate && a.startTime === startTime);
                if (!isDuplicate) {
                    appointments.push({
                        id: Date.now() + Math.random(),
                        date: currentDate,
                        time: timeDisplay,
                        startTime: startTime,
                        title: title,
                        location: location,
                        therapist: therapist,
                        details: details.trim(),
                        completed: false
                    });
                }
            }
        }
    }

    return appointments.sort((a, b) => {
        // Datum formatieren für Sortierung: DD.MM.YYYY -> YYYY-MM-DD
        const parseDate = (d) => d.split('.').reverse().join('-');
        const dateA = new Date(`${parseDate(a.date)}T${a.startTime}`);
        const dateB = new Date(`${parseDate(b.date)}T${b.startTime}`);
        return dateA - dateB;
    });
}

function saveAppointments(appointments) {
    localStorage.setItem('rehaAppts', JSON.stringify(appointments));
}

function toggleAppointmentStatus(id) {
    const storedAppts = localStorage.getItem('rehaAppts');
    if (storedAppts) {
        const appointments = JSON.parse(storedAppts);
        const appt = appointments.find(a => a.id === id);
        if (appt) {
            appt.completed = !appt.completed;
            saveAppointments(appointments);
            renderAppointments(appointments);
        }
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('appointments-container');
    if (!container) return;

    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round large-icon">event_busy</span>
                <p>Keine Termine vorhanden.</p>
                <p class="small-text">Laden Sie Ihren Terminplan als PDF hoch.</p>
            </div>`;
        return;
    }

    container.innerHTML = '';
    appointments.forEach(appt => {
        const [day, month, year] = appt.date.split('.');
        const dateObj = new Date(year, month - 1, day);
        const monthName = dateObj.toLocaleString('de-DE', { month: 'short' });

        const card = document.createElement('div');
        card.className = `appointment-card ${appt.completed ? 'completed' : ''}`;

        // Prevent card expansion when clicking the checkbox
        const checkboxId = `check-${appt.id}`;

        card.innerHTML = `
            <div class="appt-summary">
                <div class="appt-left-group" onclick="this.closest('.appointment-card').classList.toggle('expanded')">
                    <div class="appt-date-box">
                        <span class="appt-day">${day}</span>
                        <span class="appt-month">${monthName}</span>
                    </div>
                    <div class="appt-main-info">
                        <span class="appt-time">${appt.time} Uhr</span>
                        <span class="appt-title">${appt.title}</span>
                    </div>
                </div>
                
                <div class="appt-actions">
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="${checkboxId}" ${appt.completed ? 'checked' : ''}>
                        <label for="${checkboxId}" class="custom-checkbox material-icons-round">
                            ${appt.completed ? 'check_circle' : 'radio_button_unchecked'}
                        </label>
                    </div>
                </div>
            </div>
            <div class="appt-details">
                <div class="detail-row">
                    <span class="material-icons-round">place</span>
                    <span>${appt.location}</span>
                </div>
                <div class="detail-row">
                    <span class="material-icons-round">person</span>
                    <span><strong>Mitarbeiter:</strong> ${appt.therapist}</span>
                </div>
                <div class="detail-row">
                    <span class="material-icons-round">info</span>
                    <span>${appt.details}</span>
                </div>
            </div>
        `;

        // Event Listener for Checkbox
        const checkbox = card.querySelector('input[type="checkbox"]');
        const label = card.querySelector('label');

        checkbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Prevent card expansion
            toggleAppointmentStatus(appt.id);
        });

        label.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card expansion
            // Label click triggers input change automatically, but wir stoppen hier die Propagation
        });

        container.appendChild(card);
    });
}
