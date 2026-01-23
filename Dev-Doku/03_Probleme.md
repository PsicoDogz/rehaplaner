03 – Probleme

Problem 1: PDF-Parsing – Mitarbeiter und Patienten-ID werden nicht erkannt
Symptom: Nachdem ich endlich eine PDF laden konnte, fehlten in den extrahierten Terminen kritische Daten: Die Patienten-ID war immer '—', der Therapeut hieß immer "Mitarbeiter unbekannt". Die Progress-Bar zeigte 100%, aber die Daten waren leer. Debug-Ausgaben zeigten: patIdMatch: null und empMatch: null.

Mein erster Code (fehlerhaft):

// In handlePDFUpload()
const patIdMatch = fullText.match(/Pat\. ID: (\w+)/); // FEHLER: Annahme fester Syntax
const extractedPatientId = patIdMatch ? patIdMatch[1] : '—'; // Fiel immer auf '—'

// In parseSmartAppointments()
const empMatch = line.match(/(Frau|Hr\.) [A-Z][a-z]+/); // FEHLER: Kein Support für "Dr." oder fehlende Titel

Debug-Versuche:
1. Console-Logging: Ich loggte fullText und sah, dass die ID tatsächlich da war (Pat. ID: PT12345), aber mein Regex Pat\. ID: (\w+) fand nichts. Warum? Weil manche PDFs Pat. ID : PT12345 (mit Leerzeichen) hatten. Ich probierte Pat\.\s*ID\s*:\s*(\w+), aber noch immer nichts.

2. Tesseract-Qualität testen: Ich speicherte das Canvas als PNG und sah, dass Tesseract PT12345 als PT1234S (falsches S statt 5) las. Ich dachte, das Problem sei OCR, also promptete ich: "Wie verbessere ich Tesseract-Genauigkeit?" KIMI schlug deu-Sprachmodell und höhere Auflösung (scale 2.0) vor. Half marginal.

3. Regex- Debugging: Ich nutzte regexr.com und testete meine Patterns gegen den OCR-Text. Sie funktionierten dort, aber nicht im Code. Ursache: Der OCR-Text hatte noch unsichtbare Unicode-Zeichen (\u200B – Zero-Width-Space) und \n in der Mitte von Zahlen. Mein Regex war zu strikt.

Ursache: Zwei Dinge:
a) Whitespace-Blindheit: Ich nahm an, die PDF-Syntax sei konsistent. Sie war es nicht. Pat. ID vs. Pat ID, Frau Schmidt vs. Fr.Schmidt (ohne Leerzeichen).
b) OCR-Nebeneffekte: Tesseract fügte manchmal \n nach "ID" ein, weil die PDF-Zeile umbrochen war. Mein Regex Pat\. ID: (\w+) fand Pat.<newline>ID: nicht.
Verschwendete Zeit: 12 Stunden (2h Debugging + 2h falsche Prompts).

Problem 2: Progress-Bar hängt bei 0% – PDF wird nicht geladen
Symptom: Beim Upload einer PDF (2 MB, 15 Seiten) blieb die Progress-Bar bei 0% - Datei wird geladen.... Der Browser frier ein, keine Console-Errors. Nach 30 Sekunden kam "Seite reagiert nicht". Ich musste den Tab killen.

Mein erster Code (fehlerhaft):
// In handlePDFUpload()
const arrayBuffer = await file.arrayBuffer(); // BLOCKIERT UI-THREAD!
showProgressBar(); // Wird nie angezeigt, weil oben blockiert
updateProgressBar(5, 'PDF wird initialisiert...');

Debug-Versuche:

1. SetTimeout einbauen: Ich dachte, es sei ein Render-Problem: setTimeout(() => showProgressBar(), 100). Nichts half.

2. File-Size checken: Ich dachte, 2 MB wären zu groß. Probte kleinere PDFs (200 KB) – gleiches Problem.

3. Web Worker überlegen: Prompt: "Wie lade ich PDF asynchron ohne UI-Block?" KIMI schlug Web Worker vor, aber das war zu komplex. Ich wollte es einfach nur zum Laufen bringen.

Ursache: Synchrone File-Operation blockiert Main Thread. file.arrayBuffer() ist zwar ein Promise, aber die Browser-UI wird trotzdem blockiert, wenn das ArrayBuffer zu groß ist und sofort danach pdfjsLib.getDocument() aufgerufen wird. Die Progress-Bar-DOM-Updates werden im selben Tick nicht ausgeführt.

Verschwendete Zeit: 2 Stunden + ca. 30 Minuten falsche Web-Suche.

Problem 3: Service Worker cached alte App-Version
Symptom: Nach npm run build und Deploy auf GitHub Pages zeigte mein Laptop immer noch die alte Version. Ich änderte index.html, aber nichts passierte. Ich dachte, GitHub Pages wäre langsam. Nach paar Deploys verstand ich: Der SW cached zu aggressiv.

Mein erster Code (fehlerhaft):

// In sw.js
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request)); // CACHE-ONLY! Nie up-to-date
});

Debug-Versuche:
Cache leeren: Ich ging in Chrome DevTools > Application > Clear Storage. Half nur lokal.

1. Unregister SW: navigator.serviceWorker.unregister(). Half nicht, weil der neue SW noch im waiting-State war.

2. Hard-Reload: Strg+Shift+R. Half nicht für Mobile.

3. Ursache: Der SW nutzte Cache-Only für Navigation-Requests. Der alte SW wurde nie ersetzt, weil skipWaiting() zwar im install-Event war, aber clients.claim() fehlte im activate-Event. Der neue SW aktivte sich nicht.