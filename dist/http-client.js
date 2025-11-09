import axios from 'axios';
import { getAccessToken, forceReauthenticate } from './auth.js';
let currentToken = null;
let currentUrl = null;
// Create axios instance
const httpClient = axios.create();
// Request interceptor to add auth headers
httpClient.interceptors.request.use((config) => {
    if (currentToken) {
        config.headers['Authorization'] = `Bearer ${currentToken}`;
        config.headers['cf-access-token'] = currentToken;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor to handle 401 errors and retry
httpClient.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    const originalRequest = error.config;
    // Check if this is a 401 error and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry && currentUrl) {
        originalRequest._retry = true;
        try {
            // Force re-authentication
            console.log('\nToken expired or invalid. Re-authenticating...\n');
            const newToken = await forceReauthenticate(currentUrl);
            currentToken = newToken;
            // Update the failed request with new token
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['cf-access-token'] = newToken;
            // Retry the original request
            return httpClient(originalRequest);
        }
        catch (reauthError) {
            console.error('Re-authentication failed:', reauthError);
            return Promise.reject(reauthError);
        }
    }
    return Promise.reject(error);
});
// Initialize the HTTP client with a token and URL
export async function initHttpClient(url) {
    currentUrl = url;
    currentToken = await getAccessToken(url);
}
// Get the current token (useful for logging)
export function getCurrentToken() {
    return currentToken;
}
// Export the configured axios instance
export default httpClient;
//# sourceMappingURL=http-client.js.map