//API
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

//Svaki put kada šaljemo request ka backendu, interceptor automatski dodaje JWT token u header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;