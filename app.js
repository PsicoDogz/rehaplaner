document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');

  (async () => {
    try {
      if (window.RehaDB && RehaDB.initDB) {
        await RehaDB.initDB();
        await RehaDB.seedMockups();
        console.log('RehaDB initialized and mockups seeded (if needed).');
        
        // 🔥 WICHTIG: Mockups für Demo forcieren (nach Präsentation entfernen!)
        try {
          await RehaDB.deleteMockupData();
          await RehaDB.seedMockups();
          console.log('🔄 Mockups neu geladen für Demo');
        } catch (e) {
          console.warn('Mockup reseed failed:', e);
        }
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

      // UI initialisieren
      if (typeof initUIFromDB === 'function') initUIFromDB();
      if (typeof initAPlusButton === 'function') initAPlusButton();
      if (typeof initPdfUpload === 'function') initPdfUpload();
    }
  })();

  // Service Worker Registration
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

const chatStorage = {
  verwaltung: [],
  therapeut: [],
  fahrer: []
};

// --- XSS-Schutz ---
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

// --- localStorage Funktionen ---
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

// --- Chat Funktionen ---
function initChat() {
  const nameInput = document.getElementById('chat-name-input');
  if (nameInput) {
    nameInput.value = currentUserName;
    nameInput.addEventListener('input', (e) => {
      currentUserName = e.target.value.trim() || 'Hans';
    });
  }

  loadChatFromLocalStorage();

  const contactButtons = document.querySelectorAll('.contact-btn');
  contactButtons.forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.contact-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      activeContact = button.dataset.contact;
      renderChatHistory();
    });
  });

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

  const activeButton = document.querySelector('.contact-btn.active');
  if (activeButton) {
    activeContact = activeButton.dataset.contact;
  }
  renderChatHistory();
}

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

// --- Navigation ---
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
  try {
    if (window.RehaDB && RehaDB.getAll) {
      const patients = await RehaDB.getAll('patients');
      
      const realPatients = patients.filter(p => !p.mockup && p.source !== 'mockup');
      if (realPatients.length > 0) {
        realPatients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestPatient = realPatients[0];
        
        renderData({
          name: latestPatient.name || 'Willkommen',
          patientNr: latestPatient.patientNr || '—',
          diagnosis: latestPatient.diagnosis || '',
          nextAppt: latestPatient.nextAppt || ''
        });
        return;
      }
      
      if (patients && patients.length > 0) {
        const p = patients[0];
        renderData({
          name: p.name || '—',
          patientNr: p.patientNr || '—',
          diagnosis: p.diagnosis || '',
          nextAppt: p.nextAppt || ''
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Fehler beim Lesen aus RehaDB in loadUserData:', e);
  }

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
  const nameEl = document.getElementById('home-patient-name');
  const nrEl = document.getElementById('home-patient-number');

  if (nameEl) nameEl.textContent = data.name || 'Willkommen';
  if (nrEl) nrEl.textContent = data.patientNr || (data.patientNr === 0 ? '0' : '—');
}

function saveDataLocally(data) {
  localStorage.setItem('rehaUser', JSON.stringify(data));
}

// --- Appointment System ---
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

async function saveAppointments(appointments) {
  try {
    if (window.RehaDB && RehaDB.clear && RehaDB.put) {
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

  localStorage.setItem('rehaAppts', JSON.stringify(appointments));
}

async function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    alert('Bitte wählen Sie eine PDF-Datei aus.');
    return;
  }

  try {
    if (window.RehaDB && RehaDB.deleteMockupData) {
      await RehaDB.deleteMockupData();
      console.log('Mockup-Daten wurden gelöscht.');
    }
  } catch (e) {
    console.warn('Fehler beim Löschen der Mockup-Daten:', e);
  }

  showProgressBar();
  updateProgressBar(5, 'PDF wird initialisiert...');

  try {
    if (!window.pdfjsLib) throw new Error('PDF.js ist nicht geladen (pdfjsLib undefined).');

    const arrayBuffer = await file.arrayBuffer();
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
      updateProgressBar(pageProgress, `Seite ${i} von ${totalPages}: OCR läuft...`);

      const page = await pdf.getPage(i);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      
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
        console.log(`OCR Text Seite ${i}:`, text);
      } else {
        console.warn('Tesseract nicht geladen - OCR übersprungen.');
      }
      
      canvas.remove();
    }

    updateProgressBar(95, 'Termine werden erstellt...');
    console.log('Extrahierter Gesamttext:', fullText);

    const patIdMatch = fullText.match(/Pat\s*\.\s*ID\s*[:\s]\s*(PT\d+)/i);
    const extractedPatientId = patIdMatch ? patIdMatch[1] : '—';
    console.log('Gefundene Patienten-ID:', extractedPatientId);

    const newAppointments = parseSmartAppointments(fullText);

    if (newAppointments.length > 0) {
      try {
        if (window.RehaDB && RehaDB.put) {
          const docId = 'doc-' + Date.now();
          
          const patient = {
            id: 'patient-' + docId,
            patientNr: extractedPatientId,
            name: 'Hans',
            source: 'upload',
            createdAt: new Date().toISOString()
          };
          await RehaDB.put('patients', patient);
          console.log('Patient gespeichert:', patient);

          const doc = {
            id: docId,
            filename: file.name,
            mockup: false,
            source: 'upload',
            parsed: {
              patientNr: extractedPatientId,
              trainings: [],
              appointments: newAppointments
            },
            createdAt: new Date().toISOString()
          };
          await RehaDB.put('documents', doc);

          const apptsToStore = newAppointments.map(a => Object.assign({}, a, { documentId: docId }));
          await saveAppointments(apptsToStore);

          await loadUserData();
          await loadAppointments();
        }

        updateProgressBar(100, 'Fertig!');

        setTimeout(() => {
          hideProgressBar();
          alert(`${newAppointments.length} Termine erfolgreich importiert!\nPatienten-ID: ${extractedPatientId}`);
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
    if (event && event.target) event.target.value = '';
  }
}

function parseSmartAppointments(text) {
  const appointments = [];
  const lines = text.split('\n').map(line => line.trim().replace(/\s+/g, ' ')).filter(line => line.length > 2);
  
  let currentDate = null;
  
  const skipKeywords = ['Passive-Leistung', 'Pausen für Essen', 'Essen EG', 'Ausgabe am', 'Fallnummer', 'Pat. ID', 'REHA-TRAINING'];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (skipKeywords.some(keyword => line.includes(keyword))) continue;
    
    const dateMatch = line.match(/(\d{2}\s*\.\s*\d{2}\s*\.\s*\d{4})/);
    if (dateMatch) {
      currentDate = dateMatch[1].replace(/\s/g, '');
      continue;
    }
    
    const timeMatch = line.match(/(\d{1,2}\s*:\s*\d{2})\s*-\s*(\d{1,2}\s*:\s*\d{2})/);
    if (timeMatch && currentDate) {
      const startTime = timeMatch[1].replace(/\s/g, '');
      const endTime = timeMatch[2].replace(/\s/g, '');
      const timeDisplay = `${startTime} - ${endTime}`;
      
      let serviceLine = line.replace(timeMatch[0], '').trim();
      
      const locMatch = serviceLine.match(/(?:\d+\s*\.\s*)?Etage|EG|Gruppenraum\s*\d+|Turnraum|Seminarraum/);
      let location = 'Raum unbekannt';
      if (locMatch) {
        location = locMatch[0].trim();
        serviceLine = serviceLine.replace(locMatch[0], '').trim();
      }
      
      const empMatch = serviceLine.match(/(Frau|Hr\.|Herr|Dr\.)\s+[A-ZÄÖÜ][a-zäöüß]+/);
      let therapist = 'Mitarbeiter unbekannt';
      if (empMatch) {
        therapist = empMatch[0].trim();
        serviceLine = serviceLine.replace(empMatch[0], '').trim();
      }
      
      let title = serviceLine || 'Termin';
      if (title.length > 60) title = title.substring(0, 57) + '...';
      
      const details = serviceLine.includes('Handtuch') || serviceLine.includes('Laken') 
        ? 'Handtuch, Laken' 
        : 'Bitte pünktlich erscheinen.';
      
      appointments.push({
        id: Date.now() + Math.random(),
        date: currentDate,
        time: timeDisplay,
        startTime: startTime,
        title: title,
        location: location,
        therapist: therapist,
        details: details,
        completed: false
      });
    }
  }
  
  appointments.sort((a, b) => {
    const [dA, mA, yA] = a.date.split('.').map(Number);
    const [dB, mB, yB] = b.date.split('.').map(Number);
    
    if (yA !== yB) return yA - yB;
    if (mA !== mB) return mA - mB;
    if (dA !== dB) return dA - dB;
    
    const [hA, minA] = (a.startTime || '00:00').split(':').map(Number);
    const [hB, minB] = (b.startTime || '00:00').split(':').map(Number);
    
    if (hA !== hB) return hA - hB;
    return minA - minB;
  });
  
  console.log('CHRONOLOGISCH SORTIERT:', appointments.map(a => `${a.date} ${a.startTime} - ${a.title}`));
  return appointments;
}

function toggleAppointmentStatus(id) {
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

function renderAppointments(appointments) {
  const container = document.getElementById('appointments-container');
  if (!container) return;

  const sorted = [...appointments].sort((a, b) => {
    const [dA, mA, yA] = a.date.split('.').map(Number);
    const [dB, mB, yB] = b.date.split('.').map(Number);
    
    if (yA !== yB) return yA - yB;
    if (mA !== mB) return mA - mB;
    if (dA !== dB) return dA - dB;
    
    const [hA, minA] = (a.startTime || '00:00').split(':').map(Number);
    const [hB, minB] = (b.startTime || '00:00').split(':').map(Number);
    
    if (hA !== hB) return hA - hB;
    return minA - minB;
  });

  if (!sorted || sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round large-icon">event_busy</span>
        <p>Keine Termine vorhanden.</p>
        <p class="small-text">Laden Sie Ihren Terminplan als PDF hoch.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  sorted.forEach(appt => {
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

async function renderDocuments() {
  const container = document.getElementById('documents-container');
  if (!container) return;

  let docs = [];
  try {
    if (window.RehaDB && RehaDB.getAll) {
      docs = await RehaDB.getAll('documents');
      docs = docs.filter(d => d.title && (d.mockup || d.type));
    }
  } catch (e) {
    console.warn('Fehler beim Laden der Dokumente:', e);
  }

  if (!docs || docs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round large-icon">folder_open</span>
        <p>Keine Dokumente vorhanden.</p>
        <p class="small-text">Importierte PDFs werden hier nicht angezeigt.</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  docs.forEach(doc => {
    const isMockup = doc.mockup || doc.source === 'mockup';
    const card = document.createElement('div');
    card.className = `doc-card ${isMockup ? 'mockup' : ''}`;
    
    card.innerHTML = `
      <div class="doc-header">
        <span class="doc-type">${escapeHtml(doc.type || 'PDF')}</span>
        ${isMockup ? '<span class="mockup-badge">Demo</span>' : ''}
      </div>
      <div class="doc-title">
        ${escapeHtml(doc.title || doc.filename)}
      </div>
      <div class="doc-description">${escapeHtml(doc.description || '')}</div>
      <div class="doc-meta">
        <span>
          <span class="material-icons-round">calendar_today</span>
          ${escapeHtml(doc.date || new Date(doc.createdAt).toLocaleDateString('de-DE'))}
        </span>
        <span>
          <span class="material-icons-round">description</span>
          ${escapeHtml(doc.size || '—')}
        </span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

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

      if (typeof renderDocuments === 'function') await renderDocuments();
      
      await loadAppointments();
    }
  } catch (e) {
    console.warn('initUIFromDB Fehler:', e);
  }
}

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
  if (state === 'compact') document.documentElement.style.fontSize = '14px';
  else if (state === 'normal') document.documentElement.style.fontSize = '';
  else if (state === 'expanded') document.documentElement.style.fontSize = '18px';
}

function initPdfUpload() {
  const input = document.getElementById('pdf-upload');
  if (!input) return;
  input.removeEventListener('change', handlePDFUpload);
  input.addEventListener('change', handlePDFUpload);
}

window.initNavigation = initNavigation;
window.initChat = initChat;
window.initAppointments = initAppointments;
window.initUIFromDB = initUIFromDB;
window.initAPlusButton = initAPlusButton;