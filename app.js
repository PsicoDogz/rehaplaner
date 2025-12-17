// app.js

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadUserData();
  initAppointments();
  initChat();
  
  // Service Worker Registration für Vite PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
});

// --- Chat-State & Helper-Funktionen (JSON-basiert, kein Supabase) ---

let currentChatKey = 'verwaltung'; // aktueller Raum: verwaltung | therapeut | fahrer
let chatData = {
  verwaltung: [],
  therapeut: [],
  fahrer: []
};

// aktueller Nutzer dieses Browsers
let currentUser = {
  name: 'Hans',    // Default wird aus rehaUser geladen
  role: 'patient'  // patient | verwaltung | therapeut | fahrer
};

function saveCurrentUser() {
  localStorage.setItem('rehaChatUser', JSON.stringify(currentUser));
}

function loadCurrentUser() {
  // 1. Falls der Chat-User schon explizit gespeichert wurde
  const storedChatUser = localStorage.getItem('rehaChatUser');
  if (storedChatUser) {
    try {
      currentUser = JSON.parse(storedChatUser);
      return;
    } catch (e) {
      console.warn('Konnte rehaChatUser nicht parsen, nutze Fallback.', e);
    }
  }

  // 2. Fallback: Patientendaten (Hans) aus rehaUser nehmen
  const storedRehaUser = localStorage.getItem('rehaUser');
  if (storedRehaUser) {
    try {
      const userData = JSON.parse(storedRehaUser);
      currentUser.name = userData.name || 'Hans';
    } catch (e) {
      currentUser.name = 'Hans';
    }
  } else {
    currentUser.name = 'Hans';
  }

  currentUser.role = 'patient';
  saveCurrentUser();
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

function formatRole(role) {
  const roleMap = {
    'verwaltung': 'Verwaltung',
    'therapeut': 'Therapeut',
    'fahrer': 'Fahrer',
    'patient': 'Patient'
  };
  return roleMap[role] || role || '';
}

function askForRole() {
  let role = prompt(
    'Bitte Rolle für diesen Namen wählen (Verwaltung / Therapeut / Fahrer):',
    (currentUser.role && currentUser.role !== 'patient') ? formatRole(currentUser.role) : ''
  );
  if (!role) {
    // Keine Eingabe => alte Rolle behalten
    return currentUser.role;
  }

  role = role.trim().toLowerCase();

  if (role === 'verwaltung' || role === 'therapeut' || role === 'fahrer') {
    return role;
  }

  alert('Ungültige Rolle. Erlaubt sind: Verwaltung, Therapeut oder Fahrer. Vorherige Rolle bleibt bestehen.');
  return currentUser.role;
}

function handleNameChange(e) {
  const newName = e.target.value.trim();
  if (!newName) {
    e.target.value = currentUser.name; // Alten Wert wiederherstellen
    return;
  }
  if (newName === currentUser.name) return;

  currentUser.name = newName;
  
  // Nur nach Rolle fragen, wenn es "Hans" war (Standard)
  if (currentUser.role === 'patient') {
    const newRole = askForRole();
    currentUser.role = newRole;
  }
  
  saveCurrentUser();
}

// Lädt Chats aus LocalStorage
function loadChatFromLocalStorage() {
  const storageKey = `rehaChat_${currentChatKey}`;
  const stored = localStorage.getItem(storageKey);
  chatData[currentChatKey] = stored ? JSON.parse(stored) : [];
}

// Speichert Chats in LocalStorage
function saveChatToLocalStorage(contactKey) {
  const storageKey = `rehaChat_${contactKey}`;
  localStorage.setItem(storageKey, JSON.stringify(chatData[contactKey]));
}

// Lokales Senden ohne Backend
function sendMessageLocal(contactKey, text) {
  if (!text.trim()) return;
  
  const newMessage = {
    id: Date.now() + Math.random(),
    fromName: currentUser.name,
    fromRole: currentUser.role,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };
  
  // In chatData speichern
  if (!chatData[contactKey]) {
    chatData[contactKey] = [];
  }
  chatData[contactKey].push(newMessage);
  
  // In LocalStorage persistieren
  saveChatToLocalStorage(contactKey);
  
  // Neu rendern
  renderChat(contactKey);
}

function initChat() {
  // 1. User initial laden
  loadCurrentUser();
  
  // 2. Name-Input mit Event Listener verbinden
  const nameInput = document.getElementById('chat-name-input');
  if (nameInput) {
    nameInput.value = currentUser.name;
    nameInput.addEventListener('change', handleNameChange);
    nameInput.addEventListener('blur', handleNameChange);
  }

  // 3. Kontakt-Buttons initialisieren
  const contactButtons = document.querySelectorAll('.contact-btn');
  contactButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Aktiven Button setzen
      document.querySelectorAll('.contact-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Aktuellen Chat wechseln
      currentChatKey = button.dataset.contact;
      
      // Chats aus LocalStorage laden
      loadChatFromLocalStorage();
      
      // Chat rendern
      renderChat(currentChatKey);
    });
  });

  // 4. Form-Submit behandeln
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-message-input');
  
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const messageText = chatInput.value.trim();
      if (messageText) {
        sendMessageLocal(currentChatKey, messageText);
        chatInput.value = '';
      }
    });
  }

  // 5. Initiales Laden des aktiven Chats
  loadChatFromLocalStorage();
  renderChat(currentChatKey);
  const activeButton = document.querySelector('.contact-btn.active');
  if (activeButton) {
    currentChatKey = activeButton.dataset.contact;
    loadChatFromLocalStorage();
    renderChat(currentChatKey);
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

    const isOwn = (m.fromName === currentUser.name) && (m.fromRole === currentUser.role);
    const cls = isOwn ? 'from-user' : 'from-contact';
    const authorLabel = m.fromName
      ? `${escapeHtml(m.fromName)}${m.fromRole ? ' (' + escapeHtml(formatRole(m.fromRole)) + ')' : ''}`
      : '';

    return `
      <div class="chat-message ${cls}">
        <div class="chat-bubble">
          ${authorLabel ? `<div class="chat-author">${authorLabel}</div>` : ''}
          <div>${escapeHtml(m.text)}</div>
        </div>
        <span class="chat-time">${timeStr}</span>
      </div>
    `;
  }).join('');

  // Immer nach unten scrollen
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        let restText = line.replace(timeRowRegex, '').trim();

        // Smart Extraction aus dem Rest-Text
        let location = "Raum unbekannt";
        let therapist = "Mitarbeiter unbekannt";
        let title = "Termin"; // Fallback

        // A. Mitarbeiter (Hr. / Fr. / Dr.)
        const therapMatch = restText.match(/(?:Hr\.|Fr\.|Dr\.|Therapeut)\s+([A-ZÄÖÜ][a-zäöü]+(?:-[A-ZÄÖÜ][a-zäöü]+)?)/);
        if (therapMatch) {
          therapist = therapMatch[0];
        }

        // B. Ort (Raum X)
        const locMatch = restText.match(/(?:Raum|Zimmer|Etage|Haus)\s*(\d+[a-zA-Z]*)/i);
        if (locMatch) {
          location = locMatch[0];
        }

        // C. Leistung / Titel
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
          title = words.slice(0, 3).join(' ');
        }

        // Details (Mitbringen)
        let details = "";
        if (restText.toLowerCase().includes("handtuch")) details += "Handtuch ";
        if (restText.toLowerCase().includes("laken")) details += "Laken ";
        if (details === "") details = "Bitte pünktlich erscheinen.";

        // Termin hinzufügen
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

    const checkbox = card.querySelector('input[type="checkbox"]');
    const label = card.querySelector('label');

    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleAppointmentStatus(appt.id);
    });

    label.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    container.appendChild(card);
  });
}