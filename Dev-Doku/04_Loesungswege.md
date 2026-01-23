04 – Lösungswege

Lösung 1: Defensiver PDF-Parser mit Toleranzschleifen
Implementierter Code (aus app.js):

// Patienten-ID extrahieren – tolerant gegen Whitespace-Variationen
const patIdMatch = fullText.match(/Pat\.\s*ID\s*[:\s]\s*([A-Z0-9]{2,})/i);
const extractedPatientId = patIdMatch ? patIdMatch[1] : '—';

// In parseSmartAppointments():
const empMatch = line.match(/(Frau|Hr\.|Herr|Dr\.)\s+[A-ZÄÖÜ](?:[a-zäöüß]+|\.)(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?/);
let therapist = empMatch ? empMatch[0].trim() : 'Mitarbeiter unbekannt';

Erklärung:
Das neue Pattern Pat\.\s*ID\s*[:\s]\s*([A-Z0-9]{2,}) matcht:

- Pat. (escaped Punkt)

- \s* (beliebige Whitespace, inkl. \n, \u200B)

- ID

- [:\s] (Doppelpunkt ODER Leerzeichen)

- ([A-Z0-9]{2,}) (nur alphanumerisch, mind. 2 Zeichen – filtert OCR-Rauschen)

Für Mitarbeiter akzeptiert der Regex nun auch "Dr." und Doppelnamen mit Umlauten. Mit KI-Unterstützung bei der Pattern-Optimierung konnte ich die Edge-Cases schneller identifizieren.

Gelernt: Regex-Patterns müssen defensiv sein. Nie annehmen, dass OCR-Daten clean sind. Robustheit hat Priorität.

Lösung 2: Asynchrone UI-Updates via Event-Loop-Scheduling
Implementierter Code (aus app.js):

async function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // UI-Update in nächstem Event-Loop-Tick forcieren
  showProgressBar();
  await new Promise(res => setTimeout(res, 50)); // Render-Thread entblocken
  
  updateProgressBar(5, 'PDF wird initialisiert...');
  
  const arrayBuffer = await file.arrayBuffer(); // Nicht mehr UI-blockierend
  // ... restliche Logik
}

Erklärung:
setTimeout(res, 50) verschiebt die PDF-Operation in den nächsten Macrotask. Die Browser-Engine rendert zuerst die Progress-Bar, bevor CPU-intensive Arbeit startet. Dies ist kein Web Worker, aber ein ausreichendes Pattern für die Anforderungen.

Gelernt: Micro-Task vs. Macro-Task ist entscheidend. await allein garantiert keine visuelle Aktualisierung.

Lösung 3: Service Worker – Lebenszyklus-Optimierung
Implementierter Code (aus sw.js, optimiert):

self.addEventListener('install', event => {
  self.skipWaiting(); // Sofortige Aktivierung
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Sofortige Kontrolleübernahme
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  
  // Navigation: Network-First, dann Cache-Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // ...
});

Erklärung:
clients.claim() im activate-Event sorgt für sofortige Tab-Kontrolle durch den neuen SW. Zuvor warteten Tabs auf Schließung. Network-First für Navigation verhindert Veraltetes-Caching.

Gelernt: Service Worker-Events müssen zusammenarbeiten. skipWaiting ohne claim ist ineffektiv.

Lösung 4: Mockup-Seeding als Scope-Management-Tool
Implementierter Code (aus db.js):

async function seedMockups() {
  const empty = await isStoreEmpty('patients');
  if (!empty) return { seeded: false }; // Nur bei leerer DB
  
  const mockTraining = {
    id: 'mock-training-1',
    title: 'Kniebeugen an der Wand',
    mockup: true // Flag für Demo-Daten
  };
  await put('trainings', mockTraining);
}

Erklärung:
Da der Initial-Scope sehr groß war, ermöglichten Mockups frühes Feature-Testing. Die mockup-Flags erlauben spätere saubere Migration zu echten Daten. Diese Architektur-Entscheidung sicherte die Demo-Fähigkeit.

Gelernt: Scope-Cutting ist valide Projektmanagement-Praxis. Eine funktionierende Demo ist wichtiger als ein unfertiges Großfeature.

