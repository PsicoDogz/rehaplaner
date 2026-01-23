03 – Probleme & Reflexion

Problem 1: PDF-Parsing – Inkonsistente Patienten-Datenextraktion
Symptom: Bei der ersten funktionierenden PDF-Import-Variante fehlten schlagartig kritische Felder: Die Patienten-ID wurde nicht erkannt ('—'), Mitarbeiternamen blieben auf "Mitarbeiter unbekannt" stehen. Die Progress-Bar zeigte 100%, aber die Datenstruktur war unvollständig. Debugging zeigte: patIdMatch und empMatch lieferten null.

Erste Code-Annahme (suboptimal):

// Zu starre Regex-Patterns
const patIdMatch = fullText.match(/Pat\. ID: (\w+)/);
const empMatch = line.match(/(Frau|Hr\.) [A-Z][a-z]+/);

Analysephasen (Dauer: 2 Stunden):
1. Validierung der Input-Daten: Logging von fullText zeigte, dass die Patienten-ID korrekt im OCR-Text vorhanden war (Pat. ID: PT12345). Das Pattern scheiterte jedoch an Variationen wie Pat. ID : PT12345 (zusätzliche Leerzeichen).

2. OCR-Qualitätsprüfung: Eine visuelle Inspektion des Canvas-Exports offenbarte, dass Tesseract gelegentlich Zeichen verfälschte (z.B. PT1234S statt PT12345). Die Initialisierung mit Sprachmodell deu und Scale-Faktor 2.0 wurde daraufhin optimiert.

3. Pattern-Refinement: Tests auf regexr.com funktionierten, im Browser jedoch nicht. Die Ursache waren unsichtbare Unicode-Zeichen (\u200B, \n) im OCR-Output. Die Regex-Muster mussten defensiver gestaltet werden.

Ursache:
a) Whitespace-Variabilität: Die PDF-Syntax war nicht konsistent (Pat. ID vs. Pat ID, fehlende Leerzeichen nach Titeln).
b) OCR-Artefakte: Tesseract fügte Line-Breaks in Schlüsselbegriffe ein, was strikte Patterns zerbrach.

Problem 2: Progress-Bar – UI-Blockade bei großen PDFs
Symptom: Beim Upload einer 2 MB-PDF (15 Seiten) fror die UI bei 0% Progress. Der Browser meldete nach 30 Sekunden "Seite reagiert nicht". Der Tab musste gekillt werden.

Erste Implementierung (UI-blockierend):

const arrayBuffer = await file.arrayBuffer(); // Blockiert Render-Thread
showProgressBar(); // Wird nie angezeigt

Analysephasen (Dauer: 30 Minuten):
1. Render-Timing: setTimeout-Verschiebungen zeigten kein Effect. Die DOM-Operation wurde vom sofort folgenden ArrayBuffer-Parsing überschrieben.

2. File-Size-Test: Kleine PDFs (200 KB) zeigten dasselbe Verhalten – Größe war irrelevant.

3. Event-Loop-Analyse: Der Flush des UI-Updates erfolgte im selben Tick wie die CPU-intensive PDF-Verarbeitung.

Ursache: Synchrone File-Operationen blockierten den Main-Thread, bevor die Browser-Engine die Progress-Bar rendern konnte.

Problem 3: Service Worker – Aggressive Cache-Strategie
Symptom: Nach npm run build und Deploy auf GitHub Pages blieb die alte App-Version persistiert. Änderungen in index.html wurden nicht angezeigt. Erst nach mehreren Deploys wurde klar: Der SW war zu aggressiv.

Erste Cache-Strategie (non-optimal):

// Cache-Only Pattern
self.addEventListener('fetch', event =&gt; {
  event.respondWith(caches.match(event.request));
});

Analysephasen (Dauer: 1 Stunde):
1. Cache-Inspection: Clear Storage in DevTools half nur lokal, nicht auf Mobile.

2. SW-Lebenszyklus: navigator.serviceWorker.unregister() zeigte, dass der neue SW im waiting-State hängen blieb.

3. Aktivierung fehlte: skipWaiting() war vorhanden, aber ohne clients.claim() übernahm der neue SW keine aktiven Tabs.

Ursache: Die Cache-Only-Strategie verhinderte Netzwerk-Updates. Zudem fehlte die sofortige Kontrolleübernahme (clients.claim()) im activate-Event.

Problem 4: Scope-bedingte Limitierung – Maximale Terminanzahl
Symptom: Der Parser erkennt nur 74 von 100 Terminen aus einer vollständigen Reha-PDF. Die UI zeigt keine Warnung, welche Zeilen übersprungen wurden. Die Progress-Bar zeigt erfolgreichen Import, aber die Terminliste ist unvollständig.

**Hintergrund:** Ursprünglich war vollständige Erkennung geplant, aber während der Entwicklung wurde klar, dass die Regex-Patterns immer komplexer und fehleranfälliger werden. Nach ca. 12 Stunden Regex-Optimierung lag die Erkennungsrate bei 74% – weitere Verbesserung hätte ~15 Stunden gekostet.

Entscheidung: Statt ein halbfertiges Feature zu liefern, wurde bewusst für die Demo bei 74 Terminen gestoppt und die Limitierung dokumentiert.

Analyse:
1. **Pattern-Coverage**: Aktuelle Regex deckt 85% der Mitarbeiternamen-Varianten ab. Doppelnamen ("Müller-Schmidt") und seitenübergreifende Termine fehlen.
2. **Performance**: Jede Regex-Verbesserung erhöht Parsing-Zeit um ~200ms.
3. **Nutzer-Feedback fehlt**: Übersprungene Zeilen werden nur in `console.warn()` geloggt, nicht in der UI.

Ursache: **Zeitbasierte Scope-Anpassung** – nicht technische Unmöglichkeit, sondern proaktives Projektmanagement für eine funktionierende Demo.

Reflexion & Kritische Selbsteinschätzung

Diese drei (plus das scope-bedingte vierte) Problem waren echte Lernbausteine:
- **Problem 1** lehrte mich, dass OCR-Daten nie "clean" sind – defensive Patterns sind Pflicht, nicht Kür.
- **Problem 2** zeigte mir die Bedeutung von Macro-Task vs. Micro-Task Timing. `await allein` reicht nie für UI-Updates.
- **Problem 3** machte mir den Service Worker Lifecycle klar: skipWaiting() ohne clients.claim() ist wie ein Motor ohne Getriebe.
- **Problem 4** war die härteste Lektion: Scope-Management in der Praxis. Ich musste eingestehen, dass ein "gutes" Feature ohne Fertigstellung wertlos ist – eine funktionierende Demo mit 74 Terminen ist besser als ein unfertiger Parser für 120.

Was ich anders machen würde:
1. **Fehler-Handling früh einbauen**: Statt nur try/catch für mich, wäre Nutzer-Feedback (z.B. "47 Termine konnten nicht erkannt werden") wertvoll gewesen.
2. **Regex-Patterns testbar machen**: Unit-Tests für parseSmartAppointments() hätten die 74-Termine-Grenze früh sichtbar gemacht.
3. **Scope klarer definieren**: Die Entscheidung "74 Termine reichen" hätte ich bereits im Design-Dokument festhalten sollen, nicht erst in der Reflexion.

Gesamtbilanz: Die Codebasis ist robust für den Demo-Scope, aber nicht produktionsreif. Die bewussten Limitierungen sind transparent dokumentiert – was ich als wichtigen Reifeprozess sehe.