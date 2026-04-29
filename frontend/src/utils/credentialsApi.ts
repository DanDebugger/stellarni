import type { Credential } from '../pages/EmployerDashboard';

const API_BASE = 'http://127.0.0.1:3000';
const STORAGE_KEY = 'stellarni_credentials';
const MEMORY_KEY = '__stellarni_credentials_memory__';
const UPDATE_EVENT = 'stellarni-credentials-updated';
const MOCK_CREDENTIALS: Credential[] = [
  {
    id: 1,
    name: 'Dangrey',
    role: 'Frontend Developer',
    hash: 'e42855efc8468d62dd3c5fd89eed2f95613feb29b6f95bb2e1fdd4e57f5f06ad',
    date: '2026-04-29',
    address: 'GATUMKHNJS547PR63EHHP5627LWSJ4ID4GXOUK5KYMLZIDL6Y44LE4IR',
    employer_address: 'GAL34BBIENLTLF5SIFIU4YOSHRIKSFDS3L3B5E2APBSSOBK62HBN7TPN',
    institution_address: 'GAL34BBIENLTLF5SIFIU4YOSHRIKSFDS3L3B5E2APBSSOBK62HBN7TPN',
    verified: true,
    employer_signed: true,
    institution_signed: false,
    task_title: 'Build responsive portfolio page',
    task_status: 'accomplished',
    certificate_name: 'Frontend Internship Completion',
    completion_notes: 'Completed assigned UI task with responsive behavior.',
    reward_tx_hash: '0ef43d7a4a4a929c66e5420963c3d287c0629bd926d31334c240315ddbbcea93',
  },
  {
    id: 2,
    name: 'Alex Cruz',
    role: 'UI/UX Intern',
    hash: 'fd9ff959922b8589429e8544d1aa7027068f397d7bea782fc96029879a7e32ca',
    date: '2026-04-28',
    address: 'GAL34BBIENLTLF5SIFIU4YOSHRIKSFDS3L3B5E2APBSSOBK62HBN7TPN',
    employer_address: 'GAL34BBIENLTLF5SIFIU4YOSHRIKSFDS3L3B5E2APBSSOBK62HBN7TPN',
    institution_address: 'GAL34BBIENLTLF5SIFIU4YOSHRIKSFDS3L3B5E2APBSSOBK62HBN7TPN',
    verified: false,
    employer_signed: false,
    institution_signed: false,
    task_title: 'Create dashboard prototype',
    task_status: 'assigned',
    completion_notes: '',
  },
];

export async function fetchCredentials(): Promise<Credential[]> {
  try {
    const res = await fetch(`${API_BASE}/api/credentials`);
    if (res.ok) {
      const creds = (await res.json()) as Credential[];
      if (Array.isArray(creds) && creds.length > 0) {
        writeStorage(JSON.stringify(creds));
        return creds;
      }
    }
  } catch {
    // fallback below
  }

  const raw = readStorage();
  if (!raw) {
    writeStorage(JSON.stringify(MOCK_CREDENTIALS));
    return MOCK_CREDENTIALS;
  }
  try {
    const parsed = JSON.parse(raw) as Credential[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      writeStorage(JSON.stringify(MOCK_CREDENTIALS));
      return MOCK_CREDENTIALS;
    }
    return parsed;
  } catch {
    writeStorage(JSON.stringify(MOCK_CREDENTIALS));
    return MOCK_CREDENTIALS;
  }
}

export async function createCredential(cred: Omit<Credential, 'id' | 'verified' | 'employer_signed' | 'institution_signed'>): Promise<Credential> {
  const next: Credential = {
    ...cred,
    id: 0,
    verified: false,
    employer_signed: false,
    institution_signed: false,
  };
  try {
    const res = await fetch(`${API_BASE}/api/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (res.ok) {
      const created = (await res.json()) as Credential;
      const fresh = await fetchCredentials();
      writeStorage(JSON.stringify(fresh));
      return created;
    }
  } catch {
    // fallback below
  }

  const existing = await fetchCredentials();
  const maxId = existing.reduce((acc, c) => (c.id > acc ? c.id : acc), 0);
  const localNext: Credential = { ...next, id: maxId + 1 };
  writeStorage(JSON.stringify([localNext, ...existing]));
  return localNext;
}

export async function updateCredentialStatus(payload: {
  hash: string;
  employer_signed?: boolean;
  institution_signed?: boolean;
  verified?: boolean;
  task_title?: string;
  task_status?: 'assigned' | 'accomplished';
  certificate_name?: string;
  completion_notes?: string;
  employer_certificate_pdf?: string;
  reward_tx_hash?: string;
}): Promise<Credential> {
  try {
    const res = await fetch(`${API_BASE}/api/credentials/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = (await res.json()) as Credential;
      const fresh = await fetchCredentials();
      writeStorage(JSON.stringify(fresh));
      return updated;
    }
  } catch {
    // fallback below
  }

  const existing = await fetchCredentials();
  const idx = existing.findIndex((c) => c.hash === payload.hash);
  if (idx < 0) {
    throw new Error('Credential not found in local storage');
  }
  const prev = existing[idx];
  const updatedCredential: Credential = {
    ...prev,
    employer_signed: payload.employer_signed ?? prev.employer_signed,
    institution_signed: payload.institution_signed ?? prev.institution_signed,
    verified: payload.verified ?? prev.verified,
    task_title: payload.task_title ?? prev.task_title,
    task_status: payload.task_status ?? prev.task_status,
    certificate_name: payload.certificate_name ?? prev.certificate_name,
    completion_notes: payload.completion_notes ?? prev.completion_notes,
    employer_certificate_pdf: payload.employer_certificate_pdf ?? prev.employer_certificate_pdf,
    reward_tx_hash: payload.reward_tx_hash ?? prev.reward_tx_hash,
  };
  existing[idx] = updatedCredential;
  writeStorage(JSON.stringify(existing));
  return updatedCredential;
}

export function clearCredentialsStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  (globalThis as any)[MEMORY_KEY] = null;
  emitUpdate();
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return ((globalThis as any)[MEMORY_KEY] as string | null) ?? null;
  }
}

function writeStorage(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    (globalThis as any)[MEMORY_KEY] = value;
  }
  emitUpdate();
}

function emitUpdate() {
  try {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch {
    // ignore non-browser context
  }
}

export const CREDENTIALS_UPDATED_EVENT = UPDATE_EVENT;
