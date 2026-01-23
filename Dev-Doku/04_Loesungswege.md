04 – Lösungswege

Lösung 1: Robuster PDF-Parser mit Fault-Tolerance
Funktionierender Code (aus app.js):

// Patienten-ID extrahieren – tolerant gegen Whitespace und OCR-Fehler
const patIdMatch = fullText.match(/Pat\.\s*ID\s*[:\s]\s*([A-Z0-9]{2,})/i);
const extractedPatientId = patIdMatch ? patIdMatch[1] : '—';

// In parseSmartAppointments():
const empMatch = line.match(/(Frau|Hr\.|Herr|Dr\.)\s+[A-ZÄÖÜ](?:[a-zäöüß]+|\.)(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?/);
let therapist = empMatch ? empMatch[0].trim() : 'Mitarbeiter unbekannt';

Erklärung:
Der neue Regex Pat\.\s*ID\s*[:\s]\s*([A-Z0-9]{2,}) matcht:
Pat. (Punkt escaped)

\s* (beliebig viele Whitespace, inkl. \n, \u200B)

ID

[:\s] (Doppelpunkt ODER Space)

([A-Z0-9]{2,}) (nur alphanumerisch, mind. 2 Zeichen – filtert OCR-Müll raus)

Für Mitarbeiter akzeptiert der Regex nun auch "Dr." und Nachnamen mit Umlauten. KIMI half mit dem Prompt: "Hier ist mein OCR-Text mit Pat.<newline>ID : PT12345. Erstelle einen Regex, der Whitespace und Linebreaks tolerant ist. Verwende Non-Capturing Groups für optionale Teile."
Gelernt: Regex muss defensiv sein. Nie annehmen, dass Daten clean sind, besonders nicht nach OCR.

Lösung 2: Non-Blocking Progress-Bar mit setTimeout-Scheduling
Funktionierender Code (aus app.js):

