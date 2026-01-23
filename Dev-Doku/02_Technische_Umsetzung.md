02 – Technische Umsetzung

Projektstruktur:
rehaplaner/
├── Dev-Doku/
│   ├── 01_Einführung_Ziele.md
│   ├── 02_Technische_Umsetzung.md
│   ├── 03_Probleme_Reflexion.md
│   ├── 04_Loesungswege.md
│   └── 05_Fazit_Reflexion.md
├── vendor/                     # Manuelle Libraries (pdf.js, tesseract.min.js)
│   ├── pdf.js                  
│   ├── pdf.worker.js
│   └── tesseract.min.js
├── app.js                      # Hauptanwendungslogik
├── db.js                       # IndexedDB-Wrapper und Mockup-Seeder
├── index.html                  # App-Shell mit allen Views
├── styles.css                  # Komplettes Styling + Mockup-Banner
├── sw.js                       # Service Worker (Cache-First Strategie)
├── manifest.json               # PWA-Manifest
├── package-lock.json 
├── package.json                # Abhängigkeiten (pdfjs-dist, tesseract.js)
├── vite.config.js              # Vite + VitePWA-Konfiguration
└── reha-logo.jpeg


Wichtigste 3 Dateien im Detail:

app.js - Zentrale Anwendungslogik. Hier läuft die komplette Funktionalität: View-Navigation, PDF-Upload-Pipeline mit OCR, Termin-Parsing, Chat-State-Management, IndexedDB-Synchronisation und UI-Steuerung. Die Funktion parseSmartAppointments() ist der kritischste Part: Sie extrahiert strukturierte Daten aus Roh-OCR-Text, validiert sie und sortiert chronologisch. **Wichtige Einschränkung aufgrund von Scope:** Diese Funktion wurde bewusst nicht vollständig optimiert – sie erkennt maximal 74 Termine aus einem Reha-Plan, da die Regex-Patterns für Mitarbeiternamen mit Bindestrichen, Doppelnamen oder Termine über Seitengrenzen hinweg nicht abdecken. Dies war eine bewusste architektonische Entscheidung für die Demo-Fähigkeit. Die Module wurden durch iterative Entwicklung und gezielte KI-Unterstützung bei komplexen Regex-Patterns verfeinert, wie im KI-Verzeichnis dokumentiert.

db.js – IndexedDB-Abstraktionsschicht. Bietet RehaDB.put(), RehaDB.getAll(), clearAllStores() und seedMockups(). Die asynchrone Transaktionslogik von IndexedDB erforderte intensive Debugging-Sitzungen, um Race Conditions zu vermeiden – ein Lernprozess, der mir deutlich mehr Zeit gekostet hat als geplant. Die Funktion deleteMockupData() sichert, dass Demo-Daten seperat von echten Uploads verwaltet werden – eine Architekturentscheidung für saubere Trennung, die sich in der Praxis bewährt hat.

sw.js – Service Worker mit intelligenter Cache-Strategie. Nutzt Network-First für Navigationsanfragen (immer aktuelle index.html) und Cache-First für statische Assets. Die Initial-Cache-Strategie wurde refaktoriert, um häufige Cache-Invalidierungs-Probleme zu lösen – im activate-Event werden alte Caches nun systematisch aufgeräumt. Hier habe ich gelernt, dass skipWaiting() ohne clients.claim() ineffektiv ist – eine Erkenntnis, die mir erst nach mehreren Fehlversuchen klar wurde.

Kern-Code-Snippets mit bewussten Limitierungen:

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

Diese Pipeline ist die einzige Offline-fähige Lösung für PDF-Textextraktion im Client. Die asynchrone Koordination von pdf.js und Tesseract war eine der größten Herausforderungen und hat mich gelehrt, dass timing-critical Initialization nicht unterschätzt werden darf.

Snippet 2: Termin-Parsing mit Scope-Limitierung (Zeilen aus app.js)

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

**Wichtige Anmerkung:** Ursprünglich sollten alle 100~ Termine erkannt werden. Wegen Zeitmangels musste die Entwicklung bei 74 Terminen gestoppt werden – die Regex-Patterns decken nur ca. 85% der Edge-Cases ab (fehlen: Bindestriche, Doppelnamen über Seitengrenzen). Dies ist **keine technische Unfähigkeit, sondern eine bewusste Prioritäten-Entscheidung** für die Demo-Fähigkeit.

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

Mockups ermöglichten frühes UI-Testing und User-Feedback, als der PDF-Parser noch nicht funktionsfähig war. Die mockup-Flag-Strategie erlaubt spätere nahtlose Migration zu echten Daten und hat mir gezeigt, wie wichtig saubere Daten-Trennung ist.