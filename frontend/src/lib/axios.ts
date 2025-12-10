import axios from 'axios';

// Create Axios Instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', // Now proxied by Next.js
  withCredentials: true, // IMPORTANT: Sends HTTPOnly Cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Logic: If 401 (Unauthorized) and NOT already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // EXCLUSION: Do not intercept 401s from Login or MFA Verify (let the UI handle "Invalid Creds")
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/mfa/verify')) {
          return Promise.reject(error);
      }

      originalRequest._retry = true; // Mark as retrying

      try {
        // Attempt Silent Refresh (Cookie is sent automatically)
        // Backend now extracts userId from the token itself!
        const refreshRes = await api.post('/auth/refresh', {}); // Empty body
        
        const { access_token } = refreshRes.data;

        // Set the new token in headers
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

        // If Refresh Success, Retry Original Request
        return api(originalRequest);
      } catch (refreshError) {
        // If Refresh Fails, Redirect to Login
        // In a real app, you might want to use Next.js router, but window.location is safe for critical auth failure
        if (typeof window !== 'undefined') {
             window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
