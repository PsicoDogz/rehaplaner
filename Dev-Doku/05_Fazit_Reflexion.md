05 – Fazit & Reflexion
Was ich anders machen würde:

Zentrales Error-Handling von Anfang an: Der Code nutzte try/catch nur für Debugging. User-Feedback fehlte komplett. Eine Toast-Bibliothek für klare Meldungen ("PDF zu groß", "OCR fehlgeschlagen") wäre wertvoll.

Git-Hygiene verbessern: Commits wie "fix" oder "update" sind nicht nachvollziehbar. Nächstes Mal: Feature-Branches und semantische Commits (feat: OCR-Pipeline optimiert, fix: SW-Cache-Invalidation).

Was ich gelernt habe:

IndexedDB ist keine lokale JSON-Datei: Ich unterschätzte die Komplexität asynchroner Transaktionen, keyPath und onsuccess-Callbacks. Dokumentation + Experimente waren essenziell, um robuste Offline-Funktionalität zu erreichen.

Offline-First ist ein Architektur-Mindset: Nicht nur SW-Registrierung, sondern Fallback-Strategien: Was passiert bei OCR-Failures? Cache-Vollständigkeit? Diese Fragen sollten früher im Design stehen.

Selbstbewertung (1-10):
PDF-Parsing & OCR: 5/10 – Grundfunktionalität steht, aber Regex-Patterns könnten noch robuster sein (z.B. Plausibilitätsprüfung).
Offline-Funktionalität: 7/10 – Service Worker und IndexedDB syncen zuverlässig, aber Background-Sync wäre die nächste Stufe.
UI/UX: 8/10 – Responsives Design mit Material Icons, aber ARIA-Labels und Barrierefreiheit fehlen noch.