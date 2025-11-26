// app.js

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadUserData();
    registerServiceWorker();
});

// Navigation Logic
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .fab-btn');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Button Styling Update (nur für normale Nav Items)
            if (item.classList.contains('nav-item')) {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }

            // View Switching
            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                view.classList.add('hidden');
                
                if(view.id === targetId) {
                    view.classList.remove('hidden');
                    view.classList.add('active');
                }
            });
        });
    });

    // Chat Tab Selector Logic
    const chatBtns = document.querySelectorAll('.contact-btn');
    chatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chatBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Hier würde Logik folgen, um den Chat-Inhalt zu wechseln
        });
    });
}

// Data Handling (Offline First Approach)
function loadUserData() {
    // Simulierte Daten
    const userData = {
        name: "Hans",
        diagnosis: "Hüft-TEP rechts",
        nextAppt: "09:00 Uhr",
        room: "Raum 104"
    };

    // 1. Versuchen, Daten aus localStorage zu laden (Offline Fall)
    const storedData = localStorage.getItem('rehaUser');
    if (storedData) {
        renderData(JSON.parse(storedData));
        console.log('Daten aus Cache geladen');
    } else {
        // Initial rendern
        renderData(userData);
        saveDataLocally(userData);
    }

    // In einer echten App würde hier ein Fetch zum Server passieren
    // und bei Erfolg der localStorage aktualisiert werden.
}

function renderData(data) {
    // Hier würden wir normalerweise das DOM manipulieren, 
    // um "Hans" oder die Uhrzeit dynamisch einzusetzen.
    // Da es hardcoded im HTML ist, ist dies nur ein Platzhalter für die Logik.
}

function saveDataLocally(data) {
    localStorage.setItem('rehaUser', JSON.stringify(data));
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registriert: ', registration.scope);
                })
                .catch(err => {
                    console.log('SW Registrierung fehlgeschlagen: ', err);
                });
        });
    }
}