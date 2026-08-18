import type { SubmissionAttachment } from '@/lib/types';

const DB_NAME = 'skill-toss-local-files';
const STORE_NAME = 'submission-attachments';
const DB_VERSION = 1;

type StoredAttachment = SubmissionAttachment & { blob: Blob };

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open local attachment storage.'));
});

export async function putAttachment(metadata: SubmissionAttachment, file: Blob): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ ...metadata, blob: file } satisfies StoredAttachment);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not save attachment locally.'));
  });
  db.close();
}

export async function getAttachment(id: string): Promise<StoredAttachment | null> {
  const db = await openDatabase();
  const value = await new Promise<StoredAttachment | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredAttachment | undefined);
    request.onerror = () => reject(request.error ?? new Error('Could not read local attachment.'));
  });
  db.close();
  return value ?? null;
}

export async function removeAttachment(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not remove local attachment.'));
  });
  db.close();
}
