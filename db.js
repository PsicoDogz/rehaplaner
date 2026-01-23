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
        trainings: [
          { id: 'mock-tr-1', title: 'Kniebeugen (3 Sätze x 10)', note: 'Achte auf Haltung', mockup: true }
        ],
        appointments: [
          { id: 'mock-app-1', date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), title: 'Termin mit Therapeut', mockup: true }
        ]
      },
      createdAt: new Date().toISOString()
    };

    const mockTraining = Object.assign({ patientId: mockPatient.id, documentId: mockDoc.id }, mockDoc.parsed.trainings[0]);
    mockTraining.id = mockDoc.parsed.trainings[0].id;

    const mockAppointment = Object.assign({ patientId: mockPatient.id, documentId: mockDoc.id }, mockDoc.parsed.appointments[0]);
    mockAppointment.id = mockDoc.parsed.appointments[0].id;

    await put('patients', mockPatient);
    await put('documents', mockDoc);
    await put('trainings', mockTraining);
    await put('appointments', mockAppointment);

    // Default settings: A+ state
    await put('settings', { id: 'ui', aPlusState: 'normal' });

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