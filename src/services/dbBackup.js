/**
 * Backup e recuperação do IndexedDB (Fase 1).
 *
 * Usa a API IndexedDB "crua" (sem Dexie) de propósito: precisa funcionar mesmo quando
 * o Dexie não consegue abrir o banco (schema divergente, versão mais nova, upgrade abortado).
 *
 * Regras:
 * - Nunca cria nem apaga o banco principal. Se ele não existir, as funções retornam null.
 * - Snapshots ficam num banco separado (BACKUP_DB_NAME), nunca no banco principal.
 */

export const BACKUP_DB_NAME = 'ZeroAoCanadaDB_backups';
const BACKUP_STORE = 'snapshots';
const BACKUP_DB_VERSION = 1;
export const MAX_SNAPSHOTS = 3;

function getIDB() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB indisponível neste ambiente.');
  }
  return indexedDB;
}

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Abre um banco existente SEM criá-lo e SEM alterar sua versão.
 * Se o banco não existir, aborta a criação e resolve `null`.
 */
export function openExistingRawDatabase(name) {
  return new Promise((resolve, reject) => {
    let wasCreated = false;
    let req;
    try {
      req = getIDB().open(name);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = (event) => {
      // oldVersion 0 => o banco não existia. Aborta para não criar um banco vazio.
      if (event.oldVersion === 0) {
        wasCreated = true;
        req.transaction.abort();
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = (event) => {
      if (wasCreated) {
        event.preventDefault?.();
        resolve(null);
      } else {
        reject(req.error);
      }
    };
    req.onblocked = () => {
      // Outra aba segura uma versão antiga; a abertura sem versão não deveria bloquear,
      // mas registramos para diagnóstico.
      console.warn(`[dbBackup] Abertura de "${name}" bloqueada por outra conexão.`);
    };
  });
}

/**
 * Retorna a versão nativa do banco (ou 0 se não existir).
 * Atenção: o Dexie grava `versão * 10` na versão nativa do IndexedDB.
 */
export async function getRawDatabaseVersion(name) {
  const rawDb = await openExistingRawDatabase(name);
  if (!rawDb) return 0;
  const version = rawDb.version;
  rawDb.close();
  return version;
}

/** Converte a versão nativa do IndexedDB para a versão declarada no Dexie. */
export function nativeToDexieVersion(nativeVersion) {
  return Math.round(Number(nativeVersion || 0) / 10);
}

/**
 * Lê todas as object stores de um banco existente.
 * Retorna `{ name, nativeVersion, stores: { [storeName]: { keyPath, autoIncrement, records: [{ key, value }] } } }`
 * ou `null` se o banco não existir.
 */
export async function exportRawDatabase(name) {
  const rawDb = await openExistingRawDatabase(name);
  if (!rawDb) return null;

  try {
    const storeNames = Array.from(rawDb.objectStoreNames);
    const result = {
      name,
      nativeVersion: rawDb.version,
      exportedAt: new Date().toISOString(),
      stores: {}
    };
    if (storeNames.length === 0) return result;

    const tx = rawDb.transaction(storeNames, 'readonly');
    await Promise.all(
      storeNames.map(async (storeName) => {
        const store = tx.objectStore(storeName);
        const [keys, values] = await Promise.all([
          requestToPromise(store.getAllKeys()),
          requestToPromise(store.getAll())
        ]);
        result.stores[storeName] = {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement,
          records: values.map((value, idx) => ({ key: keys[idx], value }))
        };
      })
    );
    return result;
  } finally {
    rawDb.close();
  }
}

function openBackupDatabase() {
  return new Promise((resolve, reject) => {
    const req = getIDB().open(BACKUP_DB_NAME, BACKUP_DB_VERSION);
    req.onupgradeneeded = () => {
      const bdb = req.result;
      if (!bdb.objectStoreNames.contains(BACKUP_STORE)) {
        bdb.createObjectStore(BACKUP_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function countRecords(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot?.stores || {}).map(([storeName, s]) => [storeName, s.records.length])
  );
}

/**
 * Cria um snapshot completo do banco `name` no banco de backups.
 * Mantém apenas os `MAX_SNAPSHOTS` mais recentes (os mais antigos são descartados
 * somente DEPOIS que o novo snapshot foi gravado com sucesso).
 * Retorna `{ id, counts }` ou `null` se o banco de origem não existir.
 */
export async function createSnapshot(name, { reason = 'manual' } = {}) {
  const data = await exportRawDatabase(name);
  if (!data) return null;

  const bdb = await openBackupDatabase();
  try {
    const record = {
      createdAt: new Date().toISOString(),
      sourceDb: name,
      fromNativeVersion: data.nativeVersion,
      fromVersion: nativeToDexieVersion(data.nativeVersion),
      reason,
      counts: countRecords(data),
      data
    };

    const id = await new Promise((resolve, reject) => {
      const tx = bdb.transaction(BACKUP_STORE, 'readwrite');
      const req = tx.objectStore(BACKUP_STORE).add(record);
      let newId;
      req.onsuccess = () => {
        newId = req.result;
      };
      tx.oncomplete = () => resolve(newId);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transação de backup abortada.'));
    });

    await pruneSnapshots(bdb, MAX_SNAPSHOTS);
    return { id, counts: record.counts };
  } finally {
    bdb.close();
  }
}

async function pruneSnapshots(bdb, keep) {
  await new Promise((resolve, reject) => {
    const tx = bdb.transaction(BACKUP_STORE, 'readwrite');
    const store = tx.objectStore(BACKUP_STORE);
    const keysReq = store.getAllKeys();
    keysReq.onsuccess = () => {
      const keys = keysReq.result.slice().sort((a, b) => a - b);
      const toDelete = keys.slice(0, Math.max(0, keys.length - keep));
      toDelete.forEach((k) => store.delete(k));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Lista os snapshots (sem os dados, apenas metadados). */
export async function listSnapshots() {
  const bdb = await openBackupDatabase();
  try {
    const tx = bdb.transaction(BACKUP_STORE, 'readonly');
    const all = await requestToPromise(tx.objectStore(BACKUP_STORE).getAll());
    return all.map(({ data, ...meta }) => meta);
  } finally {
    bdb.close();
  }
}

/** Retorna um snapshot completo pelo id. */
export async function getSnapshot(id) {
  const bdb = await openBackupDatabase();
  try {
    const tx = bdb.transaction(BACKUP_STORE, 'readonly');
    return await requestToPromise(tx.objectStore(BACKUP_STORE).get(id));
  } finally {
    bdb.close();
  }
}

const BINARY_JSON_TYPE = 'ArrayBuffer';

function bytesToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Replacer do JSON.stringify: dados binários (ex.: áudio das gravações em voiceRecordings)
 * viram `{ __type: 'ArrayBuffer', encoding: 'base64', data }` em vez de `{}`.
 */
export function binaryJsonReplacer(_key, value) {
  if (value instanceof ArrayBuffer) {
    return { __type: BINARY_JSON_TYPE, encoding: 'base64', data: bytesToBase64(new Uint8Array(value)) };
  }
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return { __type: BINARY_JSON_TYPE, encoding: 'base64', data: bytesToBase64(bytes) };
  }
  return value;
}

/** Reviver do JSON.parse: inverso de `binaryJsonReplacer` (para restaurar um backup). */
export function binaryJsonReviver(_key, value) {
  if (
    value &&
    typeof value === 'object' &&
    value.__type === BINARY_JSON_TYPE &&
    value.encoding === 'base64' &&
    typeof value.data === 'string'
  ) {
    return base64ToArrayBuffer(value.data);
  }
  return value;
}

/** Serializa um export do banco preservando os dados binários. */
export function serializeDatabaseExport(data) {
  return JSON.stringify(data, binaryJsonReplacer, 2);
}

/**
 * Exporta o banco atual como JSON e dispara o download no navegador.
 * Inclui os áudios das gravações (base64). Funciona mesmo quando o Dexie não consegue abrir o banco.
 */
export async function downloadDatabaseAsJson(name) {
  const data = await exportRawDatabase(name);
  if (!data) throw new Error('Nenhum banco local encontrado para exportar.');
  const json = serializeDatabaseExport(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return countRecords(data);
}
