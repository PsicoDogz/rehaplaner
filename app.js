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
  const chatMessages = document.getElementById('chat-messages');
  
  if (chatForm && chatMessageInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatMessageInput.value.trim();
      
      if (text !== '') {
        // Eigene Nachricht speichern und anzeigen
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
            role: activeContact === 'verwaltung' ? 'Verwaltung' : 
                  activeContact === 'therapeut' ? 'Therapeut' : 'Fahrer',
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

// --- Rest der App bleibt unverändert ---

// Navigation Logic
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

// Data Handling
function loadUserData() {
  const userData = {
    name: "Hans",
    diagnosis: "Hüft-TEP rechts",
    nextAppt: "09:00 Uhr",
    room: "Raum 104"
  };

  const storedData = localStorage.getItem('rehaUser');
  if (storedData) {
    renderData(JSON.parse(storedData));
    console.log('Daten aus Cache geladen');
  } else {
    renderData(userData);
    saveDataLocally(userData);
  }
}

function renderData(data) {
  // Platzhalter für DOM-Manipulation
}

function saveDataLocally(data) {
  localStorage.setItem('rehaUser', JSON.stringify(data));
}

// Appointment System (vollständig erhalten)
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

  showProgressBar();
  updateProgressBar(5, 'PDF wird initialisiert...');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
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

      if (textContent.items.length < 5) {
        updateProgressBar(pageProgress, `Seite ${i}: OCR wird durchgeführt...`);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

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
    event.target.value = '';
  }
}

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
      console.log("Neuer Datums-Block gefunden:", currentDate);
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
          title = words.slice(0, 3).join(' ');
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