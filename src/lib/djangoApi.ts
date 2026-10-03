import { isUserRole, type UserProfile, type UserRole } from '@/lib/types';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE_URL = (configuredBaseUrl ?? '').replace(/\/$/, '');
const SESSION_KEY = 'skill-toss-django-session-v1';
export const AUTH_INVALIDATED_EVENT = 'skilltoss:auth-invalidated';

export type DjangoAuthUser = { id: string; email: string };
export type DjangoSession = { access: string; refresh: string };

type DjangoInstitution = { id: string; name: string; code: string };
type DjangoMe = {
  id: string;
  name: string;
  email: string;
  role: string;
  institution: DjangoInstitution | null;
  is_active: boolean;
};

type LoginResponse = { access: string; refresh: string; user: DjangoMe };
type RefreshResponse = { access: string; refresh?: string };

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

function parseStoredSession(value: string | null): DjangoSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<DjangoSession>;
    return typeof parsed.access === 'string' && typeof parsed.refresh === 'string'
      ? { access: parsed.access, refresh: parsed.refresh }
      : null;
  } catch {
    return null;
  }
}

export function getStoredSession() {
  return parseStoredSession(sessionStorage.getItem(SESSION_KEY));
}

export function storeSession(session: DjangoSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession(reason?: string) {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT, { detail: { reason } }));
}

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  for (const value of Object.values(record)) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return fallback;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

async function rawRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

let refreshPromise: Promise<DjangoSession> | null = null;

async function refreshSession(): Promise<DjangoSession> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = getStoredSession();
    if (!current) throw new ApiError(401, 'Your session has expired. Please sign in again.');
    const response = await rawRequest('/api/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: current.refresh }),
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new ApiError(response.status, errorMessage(payload, 'Your session has expired. Please sign in again.'), payload);
    }
    const refreshed = payload as RefreshResponse;
    const session = { access: refreshed.access, refresh: refreshed.refresh ?? current.refresh };
    storeSession(session);
    return session;
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, authenticated = true, retryOnUnauthorized = true, ...init } = options;
  const execute = async () => {
    const headers = new Headers(init.headers);
    if (authenticated) {
      const session = getStoredSession();
      if (!session) throw new ApiError(401, 'Please sign in to continue.');
      headers.set('Authorization', `Bearer ${session.access}`);
    }
    return rawRequest(path, {
      ...init,
      headers,
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    });
  };

  let response = await execute();
  if (authenticated && retryOnUnauthorized && response.status === 401) {
    try {
      await refreshSession();
      response = await execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your session has expired. Please sign in again.';
      clearStoredSession(message);
      throw error;
    }
  }
  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = errorMessage(payload, `Request failed (${response.status}).`);
    if (authenticated && retryOnUnauthorized && response.status === 401) clearStoredSession(message);
    throw new ApiError(response.status, message, payload);
  }
  return payload as T;
}

function mapMe(me: DjangoMe): { user: DjangoAuthUser; profile: UserProfile } {
  if (!isUserRole(me.role)) throw new Error('Your account has an unsupported role. Contact your administrator.');
  if (!me.is_active) throw new Error('Your account has been disabled. Contact your administrator.');
  return {
    user: { id: me.id, email: me.email },
    profile: {
      id: me.id,
      fullName: me.name,
      role: me.role,
      institutionId: me.institution?.id ?? null,
      avatarUrl: null,
      isActive: me.is_active,
    },
  };
}

export async function getCurrentUser() {
  return mapMe(await apiRequest<DjangoMe>('/api/auth/me/'));
}

export async function login(email: string, password: string) {
  const result = await apiRequest<LoginResponse>('/api/auth/login/', {
    method: 'POST', body: { email, password }, authenticated: false,
  });
  storeSession({ access: result.access, refresh: result.refresh });
  try {
    return await getCurrentUser();
  } catch (error) {
    clearStoredSession();
    throw error;
  }
}

export async function logout() {
  const session = getStoredSession();
  if (!session) return;
  try {
    try {
      await apiRequest<void>('/api/auth/logout/', {
        method: 'POST', body: { refresh: session.refresh }, retryOnUnauthorized: false,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const refreshed = await refreshSession();
      await apiRequest<void>('/api/auth/logout/', {
        method: 'POST', body: { refresh: refreshed.refresh }, retryOnUnauthorized: false,
      });
    }
  } finally {
    clearStoredSession();
  }
}

export async function forgotPassword(email: string) {
  return apiRequest<{ detail: string }>('/api/auth/forgot-password/', {
    method: 'POST', body: { email }, authenticated: false,
  });
}

export async function completePassword(
  kind: 'set' | 'reset', uid: string, token: string, newPassword: string, confirmPassword: string,
) {
  return apiRequest<{ detail: string }>(`/api/auth/${kind}-password/`, {
    method: 'POST',
    body: { uid, token, new_password: newPassword, confirm_password: confirmPassword },
    authenticated: false,
  });
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
  const result = await apiRequest<{ detail: string }>('/api/auth/change-password/', {
    method: 'POST',
    body: { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword },
  });
  clearStoredSession();
  return result;
}

export type ManagedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  institution: DjangoInstitution | null;
  isActive: boolean;
  status: string;
  createdAt: string;
};

type ManagedUserResponse = {
  id: string; full_name: string; email: string; role: UserRole; institution: DjangoInstitution | null;
  is_active: boolean; status: string; created_at: string;
};

const mapManagedUser = (user: ManagedUserResponse): ManagedUser => ({
  id: user.id, fullName: user.full_name, email: user.email, role: user.role,
  institution: user.institution, isActive: user.is_active, status: user.status, createdAt: user.created_at,
});

export async function listManagedUsers() {
  return (await apiRequest<ManagedUserResponse[]>('/api/users/')).map(mapManagedUser);
}

export type CreateManagedUserInput = {
  fullName: string; email: string; role: 'admin' | 'teacher' | 'student' | 'parent';
  institutionId?: string; batchId?: string; subjectId?: string; studentId?: string; relationship?: string;
};

export async function createManagedUser(input: CreateManagedUserInput) {
  const created = await apiRequest<ManagedUserResponse & { invitation_sent: boolean }>('/api/users/', {
    method: 'POST',
    body: {
      full_name: input.fullName, email: input.email, role: input.role,
      institution_id: input.institutionId, batch_id: input.batchId,
      subject_id: input.subjectId, student_id: input.studentId, relationship: input.relationship,
    },
  });
  return { ...mapManagedUser(created), invitationSent: created.invitation_sent };
}

export async function updateManagedUser(id: string, updates: { fullName?: string; email?: string; role?: UserRole }) {
  return mapManagedUser(await apiRequest<ManagedUserResponse>(`/api/users/${id}/`, {
    method: 'PATCH', body: { full_name: updates.fullName, email: updates.email, role: updates.role },
  }));
}

export async function setManagedUserActive(id: string, active: boolean) {
  return mapManagedUser(await apiRequest<ManagedUserResponse>(
    `/api/users/${id}/${active ? 'reactivate' : 'disable'}/`, { method: 'POST', body: {} },
  ));
}

export type ProvisioningBatch = { id: string; name: string; course: string; status: string };
export type ProvisioningSubject = { id: string; code: string; title: string; course: string; is_active: boolean };

export async function getProvisioningCatalog() {
  const [batches, subjects] = await Promise.all([
    apiRequest<ProvisioningBatch[]>('/api/batches/'),
    apiRequest<ProvisioningSubject[]>('/api/subjects/'),
  ]);
  return {
    batches: batches.filter((batch) => batch.status === 'active'),
    subjects: subjects.filter((subject) => subject.is_active),
  };
}
