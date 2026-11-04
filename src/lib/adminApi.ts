// Small axios client for admin pages: base URL + admin token from cookie/session.
import axios from 'axios';

export const apiUrl: string = process.env.VITE_API_URL || 'https://prodbackend.octobrain.org';

export function getToken(): string {
	if (typeof document === 'undefined') return '';
	const c = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith('token='));
	return c ? c.substring('token='.length) : sessionStorage.getItem('token') || '';
}

export const api = axios.create({ baseURL: apiUrl });
api.interceptors.request.use((config) => {
	config.headers.Authorization = `Bearer ${getToken()}`;
	return config;
});

export function errMsg(e: any, fallback = 'Something went wrong'): string {
	const status = e?.response?.status;
	if (status === 401 || status === 403) return 'Session expired. Please log in again.';
	const err = e?.response?.data?.error;
	if (typeof err === 'string') return err;
	if (typeof err?.message === 'string') return err.message;
	return e?.message || fallback;
}

// Upload one image via existing /admin/uploadImage; returns public URL.
export async function uploadImage(file: File): Promise<string> {
	const fd = new FormData();
	fd.append('image', file);
	const r = await api.post('/admin/uploadImage', fd);
	return r.data.imageUrl;
}
