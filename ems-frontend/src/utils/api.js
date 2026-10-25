import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Origin of the backend (API base without the trailing /api) - used for images
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 401 -> token invalid/expired. 403 with "deactivated" -> account disabled.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.error || '';
        const onLogin = window.location.pathname.startsWith('/login');
        const deactivated = status === 403 && /deactivated/i.test(message);

        if ((status === 401 || deactivated) && !onLogin) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Turn a path like /api/users/profile-image/<id> into an absolute URL
export const assetUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_ORIGIN}${path}`;
};

// Pull a readable message out of an axios error
export const getErrorMessage = (err, fallback = 'Something went wrong.') =>
    err?.response?.data?.error || err?.message || fallback;

// Download a CSV (or any file) through the authenticated axios instance
export const downloadFile = async (url, params, fallbackName = 'export.csv') => {
    const res = await api.get(url, { params, responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match ? match[1] : fallbackName;
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
};

export default api;
export { API_BASE_URL, API_ORIGIN };
