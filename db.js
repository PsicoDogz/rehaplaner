// Simple IndexedDB wrapper and mockup seeder
// Exposes window.RehaDB with methods: initDB(), getAll(store), put(store, obj), add(store, obj), get(store, key), seedMockups()

(function () {
  const DB_NAME = 'reha-db';
  const DB_VERSION = 1;
  const STORES = ['patients', 'documents', 'trainings', 'appointments', 'settings'];

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode = 'readonly') {
    return openDb().then(db => db.transaction(storeName, mode).objectStore(storeName));
  }

  function getAll(storeName) {
    return tx(storeName).then(store => new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }

  function get(storeName, key) {
    return tx(storeName).then(store => new Promise((res, rej) => {
      const r = store.get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }

  function put(storeName, obj) {
    return openDb().then(db => new Promise((res, rej) => {
      const t = db.transaction(storeName, 'readwrite');
      const s = t.objectStore(storeName);
      const r = s.put(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }

  function add(storeName, obj) {
    return openDb().then(db => new Promise((res, rej) => {
      const t = db.transaction(storeName, 'readwrite');
      const s = t.objectStore(storeName);
      const r = s.add(obj);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }

  function clear(storeName) {
    return openDb().then(db => new Promise((res, rej) => {
      const t = db.transaction(storeName, 'readwrite');
      const s = t.objectStore(storeName);
      const r = s.clear();
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }));
  }

  // NEU: Alle Stores leeren oder nur Mockups entfernen
  async function clearAllStores() {
    return openDb().then(async (db) => {
      const promises = STORES.map(storeName => {
        return new Promise((res, rej) => {
          const t = db.transaction(storeName, 'readwrite');
          const s = t.objectStore(storeName);
          const r = s.clear();
          r.onsuccess = () => res();
          r.onerror = () => rej(r.error);
        });
      });
      await Promise.all(promises);
    });
  }

  async function deleteMockupData() {
    const mockupStores = ['patients', 'documents', 'appointments', 'trainings'];
    const deletePromises = mockupStores.map(async (storeName) => {
      const items = await getAll(storeName);
      const mockupItems = items.filter(item => item.mockup === true || item.source === 'mockup');
      return openDb().then(db => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        return Promise.all(
          mockupItems.map(item => new Promise((res, rej) => {
            const req = store.delete(item.id);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          }))
        );
      });
    });
    await Promise.all(deletePromises);
  }

  async function isStoreEmpty(storeName) {
    const arr = await getAll(storeName);
    return !arr || arr.length === 0;
  }

  async function seedMockups() {
    // Only seed if patients store empty
    const empty = await isStoreEmpty('patients');
    if (!empty) return { seeded: false };

    // === BASIS PATIENT & DOC (bestehend) ===
    const mockPatient = {
      id: 'mock-patient-1',
      patientNr: '####',
      name: 'Max Mustermann (Mockup)',
      source: 'mockup',
      mockup: true,
      createdAt: new Date().toISOString()
    };

    const mockDoc = {
      id: 'mock-doc-1',
      filename: 'mock-plan.pdf',
      mockup: true,
      source: 'mockup',
      parsed: {
        patientNr: '####',
        trainings: [],
        appointments: []
      },
      createdAt: new Date().toISOString()
    };

    // === TRAINING MOCKUPS (3 Demo-Übungen) ===
    const mockTrainings = [
      {
        id: 'mock-training-1',
        title: 'Kniebeugen an der Wand',
        category: 'Krafttraining',
        duration: '3 x 10 Wiederholungen',
        description: 'Rücken an die Wand lehnen, langsam in Sitzposition gehen und wieder hochkommen. Knie nicht über Zehenspitzen hinaus schieben.',
        icon: 'fitness_center',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        documentId: mockDoc.id,
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-training-2',
        title: 'Beckenbodentraining',
        category: 'Entspannung',
        duration: '5 Minuten',
        description: 'Anspannen und Entspannen der Beckenbodenmuskulatur im Liegen. 5 Sekunden halten, 5 Sekunden entspannen.',
        icon: 'self_improvement',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        documentId: mockDoc.id,
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-training-3',
        title: 'Gehübungen im Flur',
        category: 'Ausdauer',
        duration: '10 Minuten',
        description: 'Kontrolliertes Gehen mit Stock, Achten auf gerade Haltung. Schritt für Schritt, nicht eilen.',
        icon: 'directions_walk',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        documentId: mockDoc.id,
        createdAt: new Date().toISOString()
      }
    ];

    // === DOKUMENTE MOCKUPS (3 Demo-Dokumente) ===
    const mockDocuments = [
      {
        id: 'mock-doc-arztbrief',
        filename: 'Arztbrief_Aufnahme.pdf',
        title: 'Arztbrief Aufnahme',
        type: 'Arztbrief',
        date: '30.06.2025',
        size: '245 KB',
        description: 'Zusammenfassung der initialen Untersuchung bei Aufnahme in die Reha',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-doc-roentgen',
        filename: 'Roentgen_Hufte.pdf',
        title: 'Röntgenbefund Hüfte',
        type: 'Befund',
        date: '28.06.2025',
        size: '1.2 MB',
        description: 'Röntgenbilder der rechten Hüfte vor OP - Arthrose Grad III',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-doc-rezept',
        filename: 'Rezept_Physio.pdf',
        title: 'Rezept Physiotherapie',
        type: 'Rezept',
        date: '30.06.2025',
        size: '89 KB',
        description: 'Verordnung für 10x Physiotherapie nach Entlassung',
        mockup: true,
        source: 'mockup',
        patientId: mockPatient.id,
        createdAt: new Date().toISOString()
      }
    ];

    // === APPOINTMENT MOCKUP (1 Demo-Termin) ===
    const mockAppointment = {
      id: 'mock-app-1',
      date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      title: 'Termin mit Therapeut (Demo)',
      mockup: true,
      source: 'mockup',
      patientId: mockPatient.id,
      documentId: mockDoc.id,
      time: '09:00 - 10:00',
      startTime: '09:00',
      location: 'Raum 104',
      therapist: 'Fr. Schmidt',
      details: 'Bitte Handtuch mitbringen',
      completed: false
    };

    // Alles speichern
    await put('patients', mockPatient);
    await put('documents', mockDoc);
    
    // Trainings speichern
    for (const training of mockTrainings) {
      await put('trainings', training);
    }
    
    // Dokumente speichern (zusätzlich zum Basis-Doc)
    for (const doc of mockDocuments) {
      await put('documents', doc);
    }
    
    await put('appointments', mockAppointment);

    // Default settings: A+ state
    await put('settings', { id: 'ui', aPlusState: 'normal' });

    console.log('Mockups seeded:', {
      patient: 1,
      documents: 1 + mockDocuments.length,
      trainings: mockTrainings.length,
      appointments: 1
    });

    return { seeded: true };
  }

  // Expose API
  window.RehaDB = {
    initDB: openDb,
    getAll,
    get,
    put,
    add,
    clear,
    clearAllStores,
    deleteMockupData,
    seedMockups,
    isStoreEmpty
  };
})();