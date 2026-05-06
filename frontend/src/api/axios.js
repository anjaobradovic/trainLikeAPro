//API
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

//Every time we send a request to the backend, the interceptor automatically adds the JWT token to the header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;