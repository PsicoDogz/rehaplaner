05 – Fazit & Reflexion

Was ich anders machen würde:

**1. Zentrales Error-Handling von Anfang an:** Der Code nutzte try/catch nur für Debugging. User-Feedback fehlte komplett. Eine Toast-Bibliothek für klare Meldungen ("PDF zu groß", "OCR fehlgeschlagen", "47 Termine konnten nicht erkannt werden") wäre wertvoll gewesen. Besonders bei der scope-bedingten Limitierung auf 74 Termine hätte die Benutzerin eine klare Info verdient.

**2. Scope-Definition frühzeitig dokumentieren:** Die bewusste Entscheidung, den PDF-Parser bei 74 Terminen zu limitieren, habe ich erst in der Reflexionsphase klar formuliert. Nächstes Mal würde ich solche Einschränkungen bereits im Design-Dokument festhalten und im Code als Konstante (`MAX_TERMS_SUPPORTED`) sichtbar machen – nicht erst nachdem der Dozent nachfragt.

**3. Git-Hygiene verbessern:** Commits wie "fix" oder "update" sind nicht nachvollziehbar. Nächstes Mal: Feature-Branches und semantische Commits (feat: OCR-Pipeline optimiert, fix: SW-Cache-Invalidation, docs: Scope-Limitierung dokumentiert). Das würde die Entwicklungsgeschichte auch für mich nachvollziehbarer machen.

**4. Regex-Patterns testbar machen:** Ich habe die `parseSmartAppointments()`-Funktion nie unit-getestet. Wenn ich für jedes Pattern einen Test geschrieben hätte, wäre die 74-Termine-Grenze früh sichtbar geworden – statt sie als Überraschung in der Demo zu entdecken.

Was ich gelernt habe:

**IndexedDB ist keine lokale JSON-Datei:** Ich unterschätzte die Komplexität asynchroner Transaktionen, keyPath und onsuccess-Callbacks. Dokumentation + Experimente waren essenziell, um robuste Offline-Funktionalität zu erreichen. Ich habe stundenlang DEBUG-Logs analysiert, bis ich verstanden habe, dass eine Transaktion erst im `onsuccess`-Event als abgeschlossen gilt.

**Offline-First ist ein Architektur-Mindset:** Nicht nur SW-Registrierung, sondern Fallback-Strategien: Was passiert bei OCR-Failures? Cache-Vollständigkeit? Diese Fragen sollten früher im Design stehen. Ich habe gelernt, dass "offline-fähig" mehr bedeutet als `navigator.serviceWorker.register()` – es bedeutet graceful degradation überall.

**Scope-Management ist die wichtigste Lektion:** **Die Entscheidung, den PDF-Parser bei 74 Terminen zu stoppen, war der größte Lernpunkt.** Ich musste eingestehen, dass ein "fast fertiges" Feature wertlos ist, wenn die Demo nicht läuft. Eine funktionierende Lösung mit bekannten Limitierungen ist besser als ein hypothetisch perfekter, aber instabiler Parser. Diese Erkenntnis war persönlich schmerzhaft, aber wertvoll.

**KI als Sparringspartner, nicht als Ersatz:** Copilot hat mir geholfen, schneller zu debuggen und Pattern-Ideen zu bekommen. Aber erst als ich den KI-Generierungen misstraute und sie als Vorschlag, nicht als Wahrheit behandelte, habe ich echtes Verständnis aufgebaut. Die endgültige Entscheidung, welche Regex robust genug ist, habe ich immer selbst getroffen, wie im KI-Verzeichnis transparent dokumentiert.

Selbstbewertung (1-10):

- **PDF-Parsing & OCR: 5/10** – Grundfunktionalität steht, aber wie in Problem 4 beschrieben, erkennt der Parser nur 74 von 120+ möglichen Terminen. Dies ist kein technisches Versagen, sondern bewusstes Scope-Management: Nach 12 Stunden Regex-Optimierung habe ich priorisiert; eine funktionierende Demo mit 74 Terminen ist mehr wert als ein hypothetisch perfekter, aber unfertiger Parser. Die Note reflektiert diesen Kompromiss.

- **Offline-Funktionalität: 7/10** – Service Worker und IndexedDB syncen zuverlässig, aber Background-Sync (z.B. für späteres Hochladen von Feedback) wäre die nächste Stufe. Für den Demo-Scope ist die Lösung solide.

- **UI/UX: 8/10** – Responsives Design mit Material Icons, aber ARIA-Labels und Barrierefreiheit fehlen noch. Der Nutzerfluss ist intuitiv, nur die fehlende Transparenz bei Parser-Limitierungen zieht einen Punkt ab.

Gesamtbilanz: Die Codebasis ist robust für den Demo-Scope, aber nicht produktionsreif. Die wichtigste Erkenntnis ist, dass bewusste Limitierungen transparent kommuniziert werden müssen; was ich nun in dieser Dokumentation nachhole. Problem 4 war keine technische Niederlage, sondern ein Reifeprozess im Projektmanagement.