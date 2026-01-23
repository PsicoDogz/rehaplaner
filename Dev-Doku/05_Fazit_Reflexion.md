05 – Fazit & Reflexion

Was ich anders machen würde (Top 3):

1. Früher mit echten Testdaten arbeiten: Ich habe 12 Stunden mit einer perfekten PDF entwickelt, die ich selbst erstellt hatte. In der Präsentation funktionierte sie nicht, weil das echte PDF anders formatiert war. Nächstes Mal: Ab Tag 1 nur mit realen, schmutzigen Daten entwickeln.

2. Bessere Fehlerbehandlung von Anfang an: Mein Code war voller try/catch, die nur console.warn ausgaben. Ein Nutzer sah nie, warum etwas failed. Ich würde ein zentrales Error-Handling bauen: Ein Toast-System, das User-Feedback gibt ("PDF zu groß", "OCR fehlgeschlagen").

3. Git & Commits strukturierter nutzen: Mein Commit-History war: "fix", "wtf", "KIMI suggestion". Ich wusste nie, welcher Stand stabil war. Nächstes Mal: Feature-Branches und descriptive commits ("feat: add PDF parsing with OCR", "fix: SW cache invalidation").

Was ich gelernt habe (3 wichtige Dinge):

1. Prompting ist ein Skill: Meine ersten Prompts waren "Hilfe, geht nicht". Die letzten waren: "Hier ist der OCR-Text: 'Pat.<linebreak> Präzision > Länge.

2. IndexedDB ist nicht localStorage: Ich dachte, localStorage.setItem() und db.put() wären ähnlich. Falsch. IndexedDB braucht Transaktionen, onsuccess-Callbacks und keyPath. Das war die härteste Lernkurve. Aber: Es ist die einzige echte Offline-Lösung.

3. Offline-First ist ein Mindset, nicht ein Feature: Es reicht nicht, einen SW zu registrieren. Man muss über Fallbacks nachdenken: Was, wenn OCR fehlschlägt? Was, wenn IndexedDB voll ist? Was, wenn der Cache alte Daten hat? Diese Fragen kamen zu spät.

Selbstbewertung (1-10):

PDF-Parsing & OCR: 4/10. Es funktioniert grundlegend, aber ist fehleranfällig und nicht robust genug für Produktion. Keine Plausibilitätsprüfung, keine Fehlerkorrektur.

Offline-Funktionalität (SW + IndexedDB): 6/10. Der Service Worker cached, aber die Strategie ist nicht optimal. Keine Background-Sync. IndexedDB-Sync funktioniert, aber die Abstraktion ist hacky.

UI/UX: 7/10. Die App sieht gut aus (Material Icons, tidy CSS), aber Accessibility (z.B. ARIA-Labels) fehlt. Die A+-Schriftgröße ist ein Nice-to-have, nicht ein Must-have.