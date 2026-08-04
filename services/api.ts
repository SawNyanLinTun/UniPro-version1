/**
 * Thin UniPro backend client (http://localhost:8000).
 * Auth uses Supabase session access_token as Bearer for protected routes.
 */

import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export type ApiJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'remote' | 'hybrid' | 'onsite';
  duration: string;
  category: string;
  description: string;
  stipend: string;
  tags: string[];
  postedDate: string;
  deadline: string;
  skills?: string[];
};

export type ApiMatchResult = {
  jobId: string;
  company: string;
  role: string;
  hscr: number;
  sgi: number;
  sssa: number;
  matchedSkills: string[];
  missingSkills: string[];
};

export type ApiApplication = {
  id: string;
  internshipId: string;
  role: string;
  company: string;
  status: 'applied' | 'under_review' | 'interview' | 'accepted' | 'rejected';
  appliedDate: string;
  recordHash?: string | null;
};

export type ApiCvExtract = {
  skills: string[];
  gpa: number | null;
  education: string[];
  experience: string[];
};

export type ApiCvAnalyze = ApiCvExtract & {
  embedding_dims: number;
  embedding_stored: boolean;
  cv_stored: boolean;
};

export type ApiMe = {
  user_id: string;
  email: string;
  full_name: string;
  role: 'student' | 'company' | 'admin';
  university?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  gpa?: number | null;
  skills?: string[];
};

/** Current Supabase access token, or null if signed out / unconfigured. */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function authHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function resolveToken(token?: string | null): Promise<string | null> {
  if (token) return token;
  return getAccessToken();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE,

  health: () => request<{ status: string }>('/health'),

  me: async (token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiMe>('/auth/me', { headers: authHeaders(access) });
  },

  listJobs: () => request<ApiJob[]>('/jobs'),

  getJob: (id: string) => request<ApiJob>(`/jobs/${id}`),

  extractCvText: async (text: string, token?: string | null) => {
    const access = await resolveToken(token);
    return request<ApiCvExtract>('/cv/extract', {
      method: 'POST',
      headers: authHeaders(access),
      body: JSON.stringify({ text }),
    });
  },

  /** Upload CV → skills + embedding stored; file is not kept on the server. */
  analyzeCv: async (file: File, token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_BASE}/cv/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${detail}`);
    }
    return res.json() as Promise<ApiCvAnalyze>;
  },

  runMatch: async (token?: string | null, internshipIds?: string[]) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiMatchResult[]>('/match', {
      method: 'POST',
      headers: authHeaders(access),
      body: JSON.stringify(internshipIds ? { internship_ids: internshipIds } : {}),
    });
  },

  listMatches: async (token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiMatchResult[]>('/matches', { headers: authHeaders(access) });
  },

  listApplications: async (token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiApplication[]>('/applications', { headers: authHeaders(access) });
  },

  apply: async (internshipId: string, token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiApplication>('/applications', {
      method: 'POST',
      headers: authHeaders(access),
      body: JSON.stringify({ internship_id: internshipId }),
    });
  },

  listSaved: async (token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<ApiJob[]>('/saved', { headers: authHeaders(access) });
  },

  saveJob: async (internshipId: string, token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<void>(`/saved/${internshipId}`, {
      method: 'POST',
      headers: authHeaders(access),
    });
  },

  unsaveJob: async (internshipId: string, token?: string | null) => {
    const access = await resolveToken(token);
    if (!access) throw new Error('Not authenticated');
    return request<void>(`/saved/${internshipId}`, {
      method: 'DELETE',
      headers: authHeaders(access),
    });
  },
};
