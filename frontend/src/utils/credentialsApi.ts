import type { Credential } from '../pages/EmployerDashboard';

const API_BASE = 'http://127.0.0.1:3000';

/** Fetch all credentials from the backend */
export async function fetchCredentials(): Promise<Credential[]> {
  const res = await fetch(`${API_BASE}/api/credentials`);
  if (!res.ok) throw new Error('Failed to fetch credentials');
  return res.json();
}

/** Register a new credential on the backend */
export async function createCredential(cred: Omit<Credential, 'id' | 'verified' | 'employer_signed' | 'institution_signed'>): Promise<Credential> {
  const res = await fetch(`${API_BASE}/api/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...cred, id: 0, verified: false, employer_signed: false, institution_signed: false }),
  });
  if (!res.ok) throw new Error('Failed to register credential');
  return res.json();
}

/** Update credential status (signed/verified) */
export async function updateCredentialStatus(payload: {
  hash: string;
  employer_signed?: boolean;
  institution_signed?: boolean;
  verified?: boolean;
}): Promise<Credential> {
  const res = await fetch(`${API_BASE}/api/credentials/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Credential not found on server');
  return res.json();
}
