
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  (async () => {
    try {
      if (window.RehaDB && RehaDB.initDB) {
        await RehaDB.initDB();
        await RehaDB.seedMockups();
        console.log('RehaDB initialized and mockups seeded (if needed).');
      } else {
        console.warn('RehaDB not found - falling back to localStorage behavior.');
      }
    } catch (err) {
      console.warn('Fehler beim Initialisieren von RehaDB:', err);
    } finally {
      // Core-Initialisierung
      initNavigation();
      loadUserData();
      initAppointments();
      initChat();

      // Neue initializations: UI from DB, A+ button, PDF upload handler
      if (typeof initUIFromDB === 'function') initUIFromDB();
      if (typeof initAPlusButton === 'function') initAPlusButton();
      if (typeof initPdfUpload === 'function') initPdfUpload();
    }
  })();

  // Service Worker Registration (falls nicht bereits vorhanden)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
});

// --- Chat-State & Globale Variablen ---

let currentUserName = 'Hans';
const currentUserRole = 'Patient';
let activeContact = 'verwaltung';

// Nachrichten-Speicher für die drei Kategorien
const chatStorage = {
  verwaltung: [],
  therapeut: [],
  fahrer: []
};

// --- XSS-Schutz (wichtig für Sicherheit) ---

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// --- localStorage Funktionen (PERSISTENZ) ---

function loadChatFromLocalStorage() {
  Object.keys(chatStorage).forEach(key => {
    const stored = localStorage.getItem(`rehaChat_${key}`);
    if (stored) {
      try {
        chatStorage[key] = JSON.parse(stored);
      } catch (e) {
        console.warn(`Konnte Chat-Historie für ${key} nicht laden`, e);
        chatStorage[key] = [];
      }
    }
  });
}

function saveChatToLocalStorage(contactKey) {
  localStorage.setItem(`rehaChat_${contactKey}`, JSON.stringify(chatStorage[contactKey]));
}

// --- Init-Funktion für Chat ---

function initChat() {
  // 1. Namens-Input initialisieren
  const nameInput = document.getElementById('chat-name-input');
  if (nameInput) {
    nameInput.value = currentUserName;
    nameInput.addEventListener('input', (e) => {
      currentUserName = e.target.value.trim() || 'Hans';
    });
  }

  // 2. Chats aus localStorage laden
  loadChatFromLocalStorage();

  // 3. Kontakt-Buttons initialisieren
  const contactButtons = document.querySelectorAll('.contact-btn');
  contactButtons.forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.contact-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      activeContact = button.dataset.contact;
      renderChatHistory();
    });
  });

  // 4. Form-Submit behandeln
  const chatForm = document.getElementById('chat-form');
  const chatMessageInput = document.getElementById('chat-message-input');

  if (chatForm && chatMessageInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatMessageInput.value.trim();

      if (text !== '') {
        const myMsg = {
          name: currentUserName,
          role: currentUserRole,
          text: text,
          type: 'sent',
          timestamp: new Date().toISOString()
        };

        chatStorage[activeContact].push(myMsg);
        saveChatToLocalStorage(activeContact);
        displayMessageOnScreen(myMsg);
        chatMessageInput.value = '';

        // Antwort-Simulation
        setTimeout(() => {
          const senderName = activeContact.charAt(0).toUpperCase() + activeContact.slice(1);
          const reply = {
            name: senderName,
            role: activeContact === 'verwaltung' ? 'Verwaltung' : activeContact === 'therapeut' ? 'Therapeut' : 'Fahrer',
            text: `Ihre Nachricht an die Abteilung ${senderName} wurde empfangen.`,
            type: 'received',
            timestamp: new Date().toISOString()
          };

          chatStorage[activeContact].push(reply);
          saveChatToLocalStorage(activeContact);
          displayMessageOnScreen(reply);
        }, 800);
      }
    });
  }

  // 5. Initiales Rendern des aktiven Chats
  const activeButton = document.querySelector('.contact-btn.active');
  if (activeButton) {
    activeContact = activeButton.dataset.contact;
  }
  renderChatHistory();
}

// --- Render-Funktionen ---

function displayMessageOnScreen(msg) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `message-bubble ${msg.type}`;

  const timeStr = msg.timestamp ?
    new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) :
    new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  msgDiv.innerHTML = `
    <div class="message-info">
      <small class="sender-name"><strong>${escapeHtml(msg.name)}</strong></small>
      <small class="sender-role">(${escapeHtml(msg.role)})</small> 
    </div>
    <div class="message-text">${escapeHtml(msg.text)}</div>
    <div class="message-time">${timeStr}</div>
  `;

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderChatHistory() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  chatMessages.innerHTML = '';

  const messages = chatStorage[activeContact] || [];
  messages.forEach(msg => {
    displayMessageOnScreen(msg);
  });
}

// --- Navigation Logic ---

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .fab-btn');
  const views = document.querySelectorAll('.view');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.classList.contains('nav-item')) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
      }

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

// --- Data Handling & Home UI ---

async function loadUserData() {
  // Versuche zuerst Daten aus RehaDB (patients) zu laden, fallback auf localStorage
  try {
    if (window.RehaDB && RehaDB.getAll) {
      const patients = await RehaDB.getAll('patients');
      if (patients && patients.length > 0) {
        // Zeige den ersten Patienten
        renderData({
          name: patients[0].name || '���',
          patientNr: patients[0].patientNr || '—',
          diagnosis: patients[0].diagnosis || '',
          nextAppt: patients[0].nextAppt || ''
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Fehler beim Lesen aus RehaDB in loadUserData:', e);
  }

  // Fallback: localStorage
  const storedData = localStorage.getItem('rehaUser');
  if (storedData) {
    renderData(JSON.parse(storedData));
    console.log('Daten aus Cache geladen');
  } else {
    const userData = {
      name: "Hans",
      diagnosis: "Hüft-TEP rechts",
      nextAppt: "09:00 Uhr",
      room: "Raum 104",
      patientNr: '—'
    };
    renderData(userData);
    saveDataLocally(userData);
  }
}

function renderData(data) {
  // Fülle Home-UI-Elemente, sichere Guard-Checks
  const nameEl = document.getElementById('home-patient-name');
  const nrEl = document.getElementById('home-patient-number');

  if (nameEl) nameEl.textContent = data.name || 'Willkommen';
  if (nrEl) nrEl.textContent = data.patientNr || (data.patientNr === 0 ? '0' : '—');

  // Optional: andere Felder befüllen, z.B. Diagnose / nextAppt (IDs nicht immer vorhanden)
  const diagEls = document.querySelectorAll('.info-row');
  // Wenn du spezifische IDs verwendest, fülle diese gezielt
}

function saveDataLocally(data) {
  localStorage.setItem('rehaUser', JSON.stringify(data));
}

// --- Appointment System (adapted to RehaDB) ---

function initAppointments() {
  const uploadInput = document.getElementById('pdf-upload');
  if (uploadInput) {
    uploadInput.addEventListener('change', handlePDFUpload);
  }
  loadAppointments();
}

async function loadAppointments() {
  try {
    if (window.RehaDB && RehaDB.getAll) {
      const appts = await RehaDB.getAll('appointments');
      if (appts && appts.length > 0) {
        renderAppointments(appts);
        return;
      }
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Termine aus RehaDB:', e);
  }

  // Fallback: localStorage
  const storedAppts = localStorage.getItem('rehaAppts');
  if (storedAppts) {
    renderAppointments(JSON.parse(storedAppts));
  } else {
    renderAppointments([]);
  }
}

function showProgressBar() {
  const pc = document.getElementById('progress-container');
  if (!pc) return;
  pc.style.display = 'flex';
  updateProgressBar(0, 'Datei wird geladen...');
}

function hideProgressBar() {
  const pc = document.getElementById('progress-container');
  if (!pc) return;
  pc.style.display = 'none';
}

function updateProgressBar(percent, statusText) {
  const fill = document.getElementById('progress-bar-fill');
  const percentText = document.getElementById('progress-percent');
  const status = document.getElementById('progress-status');
  if (fill) fill.style.width = percent + '%';
  if (percentText) percentText.textContent = Math.round(percent) + '%';
  if (status) status.textContent = statusText;
}

// PDF Upload Handler (uses pdf.js and optional Tesseract)
async function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // MIME-Fallback: manche Browser liefern keinen Type
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Bitte wählen Sie eine PDF-Datei aus.');
    return;
  }

  showProgressBar();
  updateProgressBar(5, 'PDF wird initialisiert...');

  try {
    // Sicherstellen, dass PDF.js geladen ist
    if (!window.pdfjsLib) throw new Error('PDF.js ist nicht geladen (pdfjsLib undefined).');

    const arrayBuffer = await file.arrayBuffer();

    // Robuster Aufruf: übergebe ein Objekt mit data
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    console.log('PDF loadingTask created:', loadingTask);

    let pdf;
    try {
      pdf = await loadingTask.promise;
    } catch (err) {
      console.error('Fehler beim Laden der PDF (loadingTask.promise):', err);
      throw new Error('PDF konnte nicht geladen werden: ' + (err.message || err));
    }

    console.log('PDF geladen, Seiten:', pdf.numPages);

    let fullText = '';
    const totalPages = pdf.numPages;
    let currentPage = 0;

    updateProgressBar(10, `Verarbeite ${totalPages} Seiten...`);

    for (let i = 1; i <= totalPages; i++) {
      currentPage = i;
      const pageProgress = (currentPage / totalPages) * 80 + 10;
      updateProgressBar(pageProgress, `Seite ${i} von ${totalPages} wird analysiert...`);

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Wenn kein oder sehr wenig Text vorhanden ist, OCR verwenden
      if (!textContent || textContent.items.length < 5) {
        updateProgressBar(pageProgress, `Seite ${i}: OCR wird durchgeführt...`);

        // Viewport und Canvas-Größen begrenzen, damit es nicht zu groß wird
        const baseScale = Math.min(2.0, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: baseScale });
        const maxDim = 3000;
        const scaleFactor = Math.min(1, maxDim / Math.max(viewport.width, viewport.height));
        const finalViewport = page.getViewport({ scale: baseScale * scaleFactor });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.floor(finalViewport.width);
        canvas.height = Math.floor(finalViewport.height);

        try {
          await page.render({ canvasContext: context, viewport: finalViewport }).promise;
        } catch (renderErr) {
          console.warn('Seite konnte nicht gerendert werden, überspringe OCR für diese Seite', renderErr);
          canvas.remove();
          continue;
        }

        // OCR mit Tesseract (nur wenn tesseract geladen ist)
        if (window.Tesseract) {
          const { data: { text } } = await Tesseract.recognize(canvas, 'deu', {
            logger: m => {
              if (m.status === 'recognizing text') {
                const ocrProgress = (currentPage - 1 + m.progress) / totalPages * 80 + 10;
                updateProgressBar(ocrProgress, `Seite ${i}: OCR ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          fullText += (text || '') + '\n';
        } else {
          console.warn('Tesseract nicht geladen — OCR übersprungen.');
        }

        // Aufräumen
        canvas.remove();
      } else {
        // Text-Layer vorhanden: extrahieren
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
    }

    updateProgressBar(95, 'Termine werden erstellt...');
    console.log('Extrahierter Text:', fullText);

    const newAppointments = parseSmartAppointments(fullText);

    if (newAppointments.length > 0) {
      // Speichere Document-Metadaten in RehaDB (falls vorhanden)
      try {
        if (window.RehaDB && RehaDB.put) {
          const docId = 'doc-' + Date.now();
          const doc = {
            id: docId,
            filename: file.name,
            mockup: false,
            source: 'upload',
            parsed: {
              patientNr: '—', // optional: versuche später patientNr zu extrahieren
              trainings: [],
              appointments: newAppointments
            },
            createdAt: new Date().toISOString()
          };
          await RehaDB.put('documents', doc);

          // Associate appointments with documentId and persist appointments in DB
          const apptsToStore = newAppointments.map(a => Object.assign({}, a, { documentId: docId }));
          await saveAppointments(apptsToStore);

          // Refresh UI
          await loadAppointments();
        } else {
          // Fallback to localStorage + UI
          saveAppointments(newAppointments);
          renderAppointments(newAppointments);
        }

        updateProgressBar(100, 'Fertig!');

        setTimeout(() => {
          hideProgressBar();
          alert(`${newAppointments.length} Termine erfolgreich importiert!`);
        }, 800);
      } catch (e) {
        console.error('Fehler beim Speichern importierter Termine:', e);
        hideProgressBar();
        alert('Fehler beim Speichern der Termine: ' + (e.message || e));
      }
    } else {
      hideProgressBar();
      alert('Keine Termine gefunden. Bitte prüfen Sie die Qualität des Scans.');
    }

  } catch (error) {
    console.error('Fehler beim PDF-Import:', error);
    hideProgressBar();
    alert('Fehler beim Lesen der PDF-Datei: ' + (error.message || error));
  } finally {
    // Reset input, damit dieselbe Datei erneut gewählt werden kann
    if (event && event.target) event.target.value = '';
  }
}

// --- Smart Parser für Termine (heuristisch) ---
function parseSmartAppointments(text) {
  const appointments = [];
  const lines = text.split('\n');

  let currentDate = null;
  const dateBlockRegex = /(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)?.*(\d{2}\.\d{2}\.\d{4})/;
  const timeRowRegex = /^\s*(\d{1,2}:\d{2})(?:\s*(?:-|bis)\s*(\d{1,2}:\d{2}))?/;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const dateMatch = line.match(dateBlockRegex);
    if (dateMatch) {
      currentDate = dateMatch[1];
      // console.log("Neuer Datums-Block gefunden:", currentDate);
      continue;
    }

    if (currentDate) {
      const timeMatch = line.match(timeRowRegex);
      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2] || "";
        const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;
        let restText = line.replace(timeRowRegex, '').trim();

        let location = "Raum unbekannt";
        let therapist = "Mitarbeiter unbekannt";
        let title = "Termin";

        const therapMatch = restText.match(/(?:Hr\.|Fr\.|Dr\.|Therapeut)\s+([A-ZÄÖÜ][a-zäöü]+(?:-[A-ZÄÖÜ][a-zäöü]+)?)/);
        if (therapMatch) {
          therapist = therapMatch[0];
        }

        const locMatch = restText.match(/(?:Raum|Zimmer|Etage|Haus)\s*(\d+[a-zA-Z]*)/i);
        if (locMatch) {
          location = locMatch[0];
        }

        const therapies = ["Physio", "Ergo", "Massage", "Lymphdrainage", "KG", "MT", "Krankengymnastik", "Einzel", "Gruppe", "Fango", "Heißluft"];
        let foundTherapy = [];
        for (const t of therapies) {
          if (restText.toLowerCase().includes(t.toLowerCase())) {
            let fullTitle = t;
            if (t === "KG") fullTitle = "Krankengymnastik";
            if (t === "MT") fullTitle = "Manuelle Therapie";
            foundTherapy.push(fullTitle);
          }
        }

        if (foundTherapy.length > 0) {
          title = [...new Set(foundTherapy)].join(' ');
        } else {
          const words = restText.split(/\s+/);
          title = words.slice(0, 3).join(' ') || 'Termin';
        }

        let details = "";
        if (restText.toLowerCase().includes("handtuch")) details += "Handtuch ";
        if (restText.toLowerCase().includes("laken")) details += "Laken ";
        if (details === "") details = "Bitte pünktlich erscheinen.";

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
    const parseDate = (d) => d.split('.').reverse().join('-');
    const dateA = new Date(`${parseDate(a.date)}T${a.startTime}`);
    const dateB = new Date(`${parseDate(b.date)}T${b.startTime}`);
    return dateA - dateB;
  });
}

// --- Persistenz: saveAppointments (RehaDB fallback) ---
async function saveAppointments(appointments) {
  try {
    if (window.RehaDB && RehaDB.clear && RehaDB.put) {
      // clear & re-put for simplicity
      await RehaDB.clear('appointments');
      for (const appt of appointments) {
        if (!appt.id) appt.id = 'appt-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        await RehaDB.put('appointments', appt);
      }
      console.log('Appointments saved to RehaDB');
      return;
    }
  } catch (e) {
    console.warn('Fehler beim Speichern der Termine in RehaDB:', e);
  }

  // Fallback localStorage
  localStorage.setItem('rehaAppts', JSON.stringify(appointments));
}

// --- Toggle Status ---
function toggleAppointmentStatus(id) {
  // Try DB first
  (async () => {
    try {
      if (window.RehaDB && RehaDB.getAll && RehaDB.put) {
        const appts = await RehaDB.getAll('appointments');
        const appt = appts.find(a => a.id === id);
        if (appt) {
          appt.completed = !appt.completed;
          await RehaDB.put('appointments', appt);
          renderAppointments(await RehaDB.getAll('appointments'));
          return;
        }
      }
    } catch (e) {
      console.warn('toggleAppointmentStatus DB error', e);
    }

    // Fallback localStorage
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
  })();
}

// --- Render Appointments (UI) ---
function renderAppointments(appointments) {
  const container = document.getElementById('appointments-container');
  if (!container) return;

  if (!appointments || appointments.length === 0) {
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
    // Parse date for display
    let day = '??', monthName = '', time = appt.time || '';
    if (appt.date) {
      const parts = appt.date.split('.');
      if (parts.length >= 3) {
        day = parts[0];
        const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        monthName = dateObj.toLocaleString('de-DE', { month: 'short' });
      }
    }

    const card = document.createElement('div');
    card.className = `appointment-card ${appt.completed ? 'completed' : ''}`;
    const checkboxId = `check-${appt.id}`;

    card.innerHTML = `
      <div class="appt-summary">
        <div class="appt-left-group" onclick="this.closest('.appointment-card').classList.toggle('expanded')">
          <div class="appt-date-box">
            <span class="appt-day">${escapeHtml(day)}</span>
            <span class="appt-month">${escapeHtml(monthName)}</span>
          </div>
          <div class="appt-main-info">
            <span class="appt-time">${escapeHtml(time)} Uhr</span>
            <span class="appt-title">${escapeHtml(appt.title)}</span>
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
          <span>${escapeHtml(appt.location)}</span>
        </div>
        <div class="detail-row">
          <span class="material-icons-round">person</span>
          <span><strong>Mitarbeiter:</strong> ${escapeHtml(appt.therapist)}</span>
        </div>
        <div class="detail-row">
          <span class="material-icons-round">info</span>
          <span>${escapeHtml(appt.details)}</span>
        </div>
      </div>
    `;

    const checkbox = card.querySelector('input[type="checkbox"]');
    const label = card.querySelector('label');

    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleAppointmentStatus(appt.id);
      });
    }

    if (label) {
      label.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    container.appendChild(card);
  });
}

// --- Trainings rendering (simple) ---
function renderTrainings(trainings = []) {
  const parent = document.getElementById('view-training');
  if (!parent) return;

  parent.innerHTML = '<h3>Training</h3><div id="training-list" class="appointments-list"></div>';
  const list = document.getElementById('training-list');

  if (!trainings || trainings.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="material-icons-round large-icon">fitness_center</span><p>Keine Trainings vorhanden.</p></div>`;
    return;
  }

  trainings.forEach(t => {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.innerHTML = `<h4>${escapeHtml(t.title || 'Übung')}</h4><p>${escapeHtml(t.note || '')}</p>${t.mockup ? '<small>(Mockup)</small>' : ''}`;
    list.appendChild(card);
  });
}

// --- UI Init from DB, A+ Button & Hamburger Placeholder ---

// initialisiert UI aus DB (Home patient, trainings, appointments)
async function initUIFromDB() {
  try {
    if (window.RehaDB && RehaDB.getAll) {
      const patients = await RehaDB.getAll('patients');
      if (patients && patients.length > 0) {
        const p = patients[0];
        renderData({ name: p.name || '—', patientNr: p.patientNr || '—', diagnosis: p.diagnosis || '' });
      }

      const trainings = await RehaDB.getAll('trainings');
      if (typeof renderTrainings === 'function') renderTrainings(trainings || []);

      await loadAppointments(); // wird aus RehaDB lesen und rendern
    }
  } catch (e) {
    console.warn('initUIFromDB Fehler:', e);
  }
}

// A+ button: 3-state loop persisted to settings
async function initAPlusButton() {
  const btn = document.getElementById('a-plus-btn');
  const states = ['compact', 'normal', 'expanded'];
  let state = 'normal';

  try {
    if (window.RehaDB && RehaDB.get) {
      const s = await RehaDB.get('settings', 'ui');
      state = (s && s.aPlusState) ? s.aPlusState : 'normal';
    } else {
      const local = localStorage.getItem('reha_ui_aPlusState');
      if (local) state = local;
    }
  } catch (e) {
    console.warn('initAPlusButton read error', e);
  }

  applyAPlusState(state);

  if (!btn) return;
  btn.addEventListener('click', async () => {
    state = states[(states.indexOf(state) + 1) % states.length];
    applyAPlusState(state);
    try {
      if (window.RehaDB && RehaDB.put) {
        await RehaDB.put('settings', { id: 'ui', aPlusState: state });
      } else {
        localStorage.setItem('reha_ui_aPlusState', state);
      }
    } catch (e) {
      console.warn('Error persisting A+ state', e);
    }
  });
}

function applyAPlusState(state) {
  document.body.dataset.aplus = state;
  // optional: ändere UI-Schriftgrösse hier je nach state
  if (state === 'compact') document.documentElement.style.fontSize = '14px';
  else if (state === 'normal') document.documentElement.style.fontSize = '';
  else if (state === 'expanded') document.documentElement.style.fontSize = '18px';
}

// PDF input initializer (safety wrapper)
function initPdfUpload() {
  const input = document.getElementById('pdf-upload');
  if (!input) return;
  // handler already attached in initAppointments already, but keep guard
  input.removeEventListener('change', handlePDFUpload);
  input.addEventListener('change', handlePDFUpload);
}

// Debug-Hilfen: macht Funktionen aus dem Modul global zugänglich (temporär)
window.initNavigation = initNavigation;
window.initChat = initChat;
window.initAppointments = initAppointments;
window.initUIFromDB = initUIFromDB;
window.initAPlusButton = initAPlusButton;
