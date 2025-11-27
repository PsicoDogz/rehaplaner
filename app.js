// app.js

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadUserData();
    initAppointments();
     registerServiceWorker();
});

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

    // Chat Tab Selector Logic
    const chatBtns = document.querySelectorAll('.contact-btn');
    chatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Hier würde Logik folgen, um den Chat-Inhalt zu wechseln
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

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Bitte wählen Sie eine PDF-Datei aus.');
        return;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        let useOCR = false;

        // 1. Text Extraction Attempt
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Check if page has significant text
            if (textContent.items.length < 5) {
                useOCR = true;
                console.log(`Seite ${i} scheint ein Bild zu sein. Aktiviere OCR...`);

                // Render Page to Canvas for OCR
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Perform OCR
                const { data: { text } } = await Tesseract.recognize(canvas, 'deu', {
                    logger: m => console.log(m)
                });
                fullText += text + '\n';
            } else {
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
        }

        console.log("Extrahierter Text:", fullText);
        const newAppointments = parseSmartAppointments(fullText);

        if (newAppointments.length > 0) {
            saveAppointments(newAppointments);
            renderAppointments(newAppointments);
            alert(`${newAppointments.length} Termine erfolgreich importiert!`);
        } else {
            alert('Keine Termine gefunden. Bitte prüfen Sie die Qualität des Scans.');
        }

    } catch (error) {
        console.error('Fehler beim PDF-Import:', error);
        alert('Fehler beim Lesen der PDF-Datei: ' + error.message);
    }
}

function parseSmartAppointments(text) {
    const appointments = [];

    // Normalisierung: Mehrfache Leerzeichen entfernen, Zeilenumbrüche vereinheitlichen
    const cleanText = text.replace(/\s+/g, ' ');

    // Regex für Datum (DD.MM.YYYY oder DD.MM.YY)
    const dateRegex = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g;
    // Regex für Zeit (HH:MM)
    const timeRegex = /(\d{1,2}):(\d{2})/g;

    let match;
    // Wir suchen nach jedem Datum im Text
    while ((match = dateRegex.exec(cleanText)) !== null) {
        const dateStr = match[0];
        let day = parseInt(match[1]);
        let month = parseInt(match[2]);
        let year = parseInt(match[3]);

        if (year < 100) year += 2000; // 25 -> 2025

        // Kontext-Fenster: Wir schauen uns den Text um das Datum herum an (z.B. +/- 100 Zeichen)
        const windowStart = Math.max(0, match.index - 50);
        const windowEnd = Math.min(cleanText.length, match.index + 150);
        const contextText = cleanText.substring(windowStart, windowEnd);

        // Suche nach Uhrzeit im Kontext
        const timeMatch = contextText.match(timeRegex);
        if (!timeMatch) continue; // Ohne Uhrzeit ist es wohl kein Termin
        const timeStr = timeMatch[0];

        // Smart Extraction: Suche nach Keywords im Kontext
        let location = "Raum unbekannt";
        let therapist = "Therapeut unbekannt";
        let title = "Termin";
        let details = "";

        // 1. Ort finden (Raum, Etage, Haus)
        const locMatch = contextText.match(/(Raum|Zimmer|Etage|Haus)\s*(\d+[a-zA-Z]*)/i);
        if (locMatch) location = locMatch[0];

        // 2. Therapeut finden (Hr., Fr., Dr.)
        const therapMatch = contextText.match(/(Hr\.|Fr\.|Dr\.|Therapeut)\s+([A-ZÄÖÜ][a-zäöü]+)/);
        if (therapMatch) therapist = therapMatch[0];

        // 3. Behandlungstyp raten (Keywords)
        const therapies = ["Physio", "Ergo", "Massage", "Lymphdrainage", "KG", "MT", "Krankengymnastik"];
        for (const t of therapies) {
            if (contextText.toLowerCase().includes(t.toLowerCase())) {
                title = t;
                if (t === "KG") title = "Krankengymnastik";
                if (t === "MT") title = "Manuelle Therapie";
                break;
            }
        }

        // 4. Details (Mitbringen)
        if (contextText.toLowerCase().includes("handtuch")) details += "Handtuch ";
        if (contextText.toLowerCase().includes("laken")) details += "Laken ";
        if (details === "") details = "Bitte pünktlich erscheinen.";

        // Duplikate vermeiden (gleiches Datum + gleiche Zeit)
        const isDuplicate = appointments.some(a => a.date === dateStr && a.time === timeStr);
        if (!isDuplicate) {
            appointments.push({
                id: Date.now() + Math.random(),
                date: `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`,
                time: timeStr.padStart(5, '0'), // 9:00 -> 09:00
                title: title,
                location: location,
                therapist: therapist,
                details: details.trim()
            });
        }
    }

    return appointments.sort((a, b) => {
        const dateA = new Date(a.date.split('.').reverse().join('-') + 'T' + a.time);
        const dateB = new Date(b.date.split('.').reverse().join('-') + 'T' + b.time);
        return dateA - dateB;
    });
}

function saveAppointments(appointments) {
    // Bestehende Termine laden und mergen (optional), hier überschreiben wir erstmal
    localStorage.setItem('rehaAppts', JSON.stringify(appointments));
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
        card.className = 'appointment-card';
        card.innerHTML = `
            <div class="appt-summary">
                <div class="appt-date-box">
                    <span class="appt-day">${day}</span>
                    <span class="appt-month">${monthName}</span>
                </div>
                <div class="appt-main-info">
                    <span class="appt-time">${appt.time} Uhr</span>
                    <span class="appt-title">${appt.title}</span>
                </div>
                <span class="material-icons-round expand-icon">expand_more</span>
            </div>
            <div class="appt-details">
                <div class="detail-row">
                    <span class="material-icons-round">place</span>
                    <span>${appt.location}</span>
                </div>
                <div class="detail-row">
                    <span class="material-icons-round">person</span>
                    <span>${appt.therapist}</span>
                </div>
                <div class="detail-row">
                    <span class="material-icons-round">info</span>
                    <span>${appt.details}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            card.classList.toggle('expanded');
        });

        container.appendChild(card);
    });
}
