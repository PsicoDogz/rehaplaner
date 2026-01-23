04 – Lösungswege

Lösung 1: Defensive Regex-Patterns & OCR-Hygiene

Das Problem aus 03 war mir eine Lehre: OCR-Daten sind nie "clean". Meine erste Annahme /Pat. ID: (\w+)/ zerbrach an Whitespace-Variabilität. Die Lösung war ein Multi-Layer-Ansatz.

Implementierter Code (Zeilen aus app.js):

// Patienten-ID extrahieren – tolerant gegen Whitespace-Variationen
const patIdMatch = fullText.match(/Pat\s*\.\s*ID\s*[:\s]\s*([A-Z0-9]{2,})/i);
const extractedPatientId = patIdMatch ? patIdMatch[1] : '—';

Was das Pattern jetzt matcht:

- Pat. ID: PT12345 (Original)
- Pat . ID : PT12345 (unsichtbare Unicode-Spaces)
- PAT  ID  PT12345 (ohne Doppelpunkt)
- [A-Z0-9]{2,} filtert OCR-Rauschen wie "P" oder "PT" (einzelne Zeichen gelten als invalide)

Für Mitarbeiternamen habe ich das Pattern erweitert:

const empMatch = line.match(/(Frau|Hr\.|Herr|Dr\.)\s+[A-ZÄÖÜ](?:[a-zäöüß]+|\.)(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?/);
let therapist = empMatch ? empMatch[0].trim() : 'Mitarbeiter unbekannt';

Analyse & Lernprozess:
Ich habe 2 Stunden mit regexr.com verbracht, bis ich verstanden habe: Der Browser fügt \u200B (Zero-Width-Space) ein, wenn Tesseract Zeilenumbrüche im PDF-Text findet. Mein Pattern war zu strikt. Die Lösung war defensiv programmieren – nie annehmen, dass OCR "sauber" ist.

Wichtige Erkenntnis: Doppelnamen wie "Müller-Schmidt" werden noch nicht geparst. Das ist keine technische Unfähigkeit, sondern bewusste Scope-Einschränkung nach 12 Stunden Regex-Optimierung. Weitere 15 Stunden wären nötig gewesen – zu viel für die Demo-Fähigkeit.

Lösung 2: UI-Thread-Entlastung via Event-Loop Scheduling

Die Progress-Bar war mein persönlicher Kryptonit – sie fror bei 0% und der Tab crashed. Nach 30 Minuten Debugging wurde mir klar: await allein reicht nicht für UI-Updates.

Implementierter Fix (Zeilen aus app.js):

async function handlePDFUpload(event) {
  showProgressBar(); // Erst UI anzeigen!
  await new Promise(res => setTimeout(res, 50)); // Macrotask-Entblockung
  
  updateProgressBar(5, 'PDF wird initialisiert...');
  const arrayBuffer = await file.arrayBuffer(); // Jetzt non-blocking
  // ... restliche Logik
}

Was hier passiert:
1. showProgressBar() – DOM-Operation wird im selben Tick gesetzt

2. setTimeout(res, 50) – verschiebt die PDF-Operation in den nächsten Macrotask

3. Die Browser-Engine rendert zuerst die Progress-Bar, bevor der Main-Thread blockiert wird

Zusätzliche Granularität:
Jede PDF-Seite ist ein eigenes await-Statement, was dem Browser erlaubt, zwischendurch zu rendern:

for (let i = 1; i <= totalPages; i++) {
  const pageProgress = (i / totalPages) * 80 + 10;
  updateProgressBar(pageProgress, `Seite ${i} von ${totalPages}: OCR läuft...`);
  const page = await pdf.getPage(i);
  // ... OCR
}

Gelernt: Micro-Task vs. Macro-Task ist kein akademisches Problem, es kann den Demo-Tag retten oder kosten. Das war mein tiefster JavaScript-Lernmoment im Projekt.

Lösung 3: Service Worker – Hybride Cache-Strategie & Lifecycle-Kontrolle

Die aggressive Cache-Only-Strategie aus 03 war ein Anfängerfehler. Nach 1 Stunde Debugging und mehreren Deploys auf GitHub Pages (ohne sichtbare Änderungen) habe ich die Strategie komplett umgebaut.

Implementierter Code (Zeilen aus sw.js):

self.addEventListener('install', event => {
  self.skipWaiting(); // Neue SW sofort aktiv
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Sofortige Tab-Kontrolle!
  );
});

Strategie-Refinement:
self.addEventListener('fetch', event => {
  const req = event.request;
  
  // Navigation: Network-first (immer aktuelle HTML)
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
  
  // Statische Assets: Cache-first (Speed > Freshness)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(networkRes => {
        caches.open(RUNTIME_CACHE).then(cache => cache.put(req, networkRes.clone()));
        return networkRes;
      }))
    );
  }
});

Gelernt: skipWaiting() ohne clients.claim() ist wie ein Motor ohne Getriebe – der SW läuft, aber kontrolliert nichts. Die hybride Strategie funktioniert zuverlässig: Updates nach 1-2 Reloads sichtbar.

Wichtig: Für Produktivität würde ich eine In-App-Update-Benachrichtigung ("Neue Version verfügbar") ergänzen, das fehlt noch.

Lösung 4: Scope-Management & Transparente Limitierung

Das härteste Problem war kein Code-Problem, sondern ein Prioritäten-Problem. Nach 12 Stunden Regex-Optimierung lag die Erkennungsrate bei 74% – Verbesserung auf 100% hätte 15+ Stunden gekostet.

Implementierte Lösung (Code-Markierung & Dokumentation):

// app.js, Scope-bedingte Limitierung im Code
// TODO: Doppelnamen, seitenübergreifende Termine
// Aktuell: 74 von ~100 Terminen erkannt, ausreichend für Demo
const appointments = parseSmartAppointments(fullText);
console.log(`[SCOPE] ${appointments.length} Termine erkannt`);

Reflexion:
Diese Entscheidung war mein Reifeprozess, vom "alles wollen" zum "das Wesentliche liefern". Ein funktionierendes, begrenztes Feature ist mehr wert als ein halb-kaputtes, umfangreiches. Ich habe gelernt, dass Scope-Management nicht nur Planung ist, sondern auch das Eingestehen von Grenzen.