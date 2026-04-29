type StoredUser = {
  email: string;
  password?: string;
  provider?: 'local' | 'google';
  createdAt: string;
};

const USERS_KEY = 'stellarni_users';
const CURRENT_USER_KEY = 'stellarni_current_user';

function readUsers(): StoredUser[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signUpLocalUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const users = readUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('Email is already registered. Please sign in.');
  }

  users.push({
    email: normalizedEmail,
    password,
    provider: 'local',
    createdAt: new Date().toISOString(),
  });
  writeUsers(users);
  localStorage.setItem(CURRENT_USER_KEY, normalizedEmail);
}

export function signInLocalUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === normalizedEmail && u.provider !== 'google' && u.password === password);
  if (!user) {
    throw new Error('Invalid email or password.');
  }
  localStorage.setItem(CURRENT_USER_KEY, normalizedEmail);
}

export function signInWithGoogle(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Google account did not provide an email.');
  }
  const users = readUsers();
  const existing = users.find((u) => u.email === normalizedEmail);
  if (!existing) {
    users.push({
      email: normalizedEmail,
      provider: 'google',
      createdAt: new Date().toISOString(),
    });
    writeUsers(users);
  }
  localStorage.setItem(CURRENT_USER_KEY, normalizedEmail);
}

export function clearCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}
