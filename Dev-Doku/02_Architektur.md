rehaplaner/
├── node_modules/              # (wird von gitignore ignoriert)
├── vendor/                    # Manuelle Libraries (pdf.js, tesseract.min.js)
│   ├── pdf.js
│   ├── pdf.worker.js
│   └── tesseract.min.js
├── .gitignore
├── app.js                     # Hauptanwendungslogik
├── db.js                      # IndexedDB-Wrapper und Mockup-Seeder
├── index.html                 # App-Shell mit allen Views
├── styles.css                 # Komplettes Styling + Mockup-Banner
├── sw.js                      # Service Worker (Cache-First Strategie)
├── manifest.json              # PWA-Manifest
├── vite.config.js            # Vite + VitePWA-Konfiguration
├── package.json              # Abhängigkeiten (pdfjs-dist, tesseract.js)
├── package-lock.json
├── LICENSE
└── icons/                    # App-Icons

Wichtigste 3 Dateien:
app.js - Zentrale Anwendungslogik. Hier läuft die komplette Funktionalität: View-Navigation, PDF-Upload-Pipeline mit OCR, Termin-Parsing, Chat-State-Management, IndexedDB-Synchronisation und UI-Steuerung. Die Funktion parseSmartAppointments() ist der kritischste Part: Sie extrahiert strukturierte Daten aus Roh-OCR-Text, validiert sie und sortiert chronologisch. Diese Module wurden durch iterative Entwicklung und gezielte KI-Unterstützung bei komplexen Regex-Patterns verfeinert.

db.js – IndexedDB-Abstraktionsschicht. Bietet RehaDB.put(), RehaDB.getAll(), clearAllStores() und seedMockups(). Die asynchrone Transaktionslogik von IndexedDB erforderte intensive Debugging-Sitzungen, um Race Conditions zu vermeiden. Die Funktion deleteMockupData() sichert, dass Demo-Daten seperat von echten Uploads verwaltet werden – eine Architekturentscheidung für saubere Trennung.

sw.js – Service Worker mit intelligenter Cache-Strategie. Nutzt Network-First für Navigationsanfragen (immer aktuelle index.html) und Cache-First für statische Assets. Die Initial-Cache-Strategie wurde refaktoriert, um häufige Cache-Invalidierungs-Probleme zu lösen – im activate-Event werden alte Caches nun systematisch aufgeräumt.

Kern-Code-Snippets:

Snippet 1: PDF-OCR-Pipeline (aus app.js)

async function handlePDFUpload(event) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    // Canvas-Rendering...
    const { data: { text } } = await Tesseract.recognize(canvas, 'deu', {
      logger: m => updateProgressBar(...)
    });
    fullText += text + '\n';
  }
}

Diese Pipeline ist die einzige Offline-fähige Lösung für PDF-Textextraktion im Client. Die asynchrone Koordination von pdf.js und Tesseract war eine der größten Herausforderungen.


Snippet 2: Termin-Parsing (Zeilen aus app.js)

function parseSmartAppointments(text) {
  const lines = text.split('\n').map(l => l.trim().replace(/\s+/g, ' '));
  let currentDate = null;
  
  for (const line of lines) {
    const dateMatch = line.match(/(\d{2}\s*\.\s*\d{2}\s*\.\s*\d{4})/);
    if (dateMatch) { currentDate = dateMatch[1]; continue; }
    
    const timeMatch = line.match(/(\d{1,2}\s*:\s*\d{2})\s*-\s*(\d{1,2}\s*:\s*\d{2})/);
    if (timeMatch && currentDate) {
      // ... Extraktion und Validierung
      appointments.push({ date: currentDate, time: ..., title: ... });
    }
  }
  return appointments.sort(...); // Chronologische Sortierung
}

Der Algorithmus extrahiert strukturierte Daten aus OCR-Rohdaten. Die defensiven Regex-Patterns wurden durch mehrere Iterationszyklen und KI-Assistenz bei Edge-Cases optimiert.


Snippet 3: IndexedDB-Mockup-Seeding (Zeilen aus db.js)

async function seedMockups() {
  if (!(await isStoreEmpty('patients'))) return { seeded: false };
  
  const mockTraining = {
    id: 'mock-training-1',
    title: 'Kniebeugen an der Wand',
    mockup: true // Markiert als Demo-Daten
  };
  await put('trainings', mockTraining);
}

Mockups ermöglichten frühes UI-Testing und User-Feedback. Die mockup-Flag-Strategie erlaubt spätere nahtlose Migration zu echten Daten.