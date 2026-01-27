import { ref } from "vue";

/**
 * Base API composable voor alle HTTP requests
 * Bevat gedeelde functionaliteit voor loading states, error handling en fetch calls
 */
export function useApi() {
  const loading = ref(false);
  const error = ref(null);

  // Backend URL - prefer explicit VITE_API_URL when set; otherwise use relative paths so Vite dev proxy can route '/api' during development
  const ENV_BASE = import.meta.env.VITE_API_URL;
  let BASE_URL = '';
  if (ENV_BASE) {
    BASE_URL = ENV_BASE.replace(/\/$/, '');
  } else if (typeof window !== 'undefined' && window.SCOREBOARD_API_BASE) {
    // Allow a runtime-injected global (useful for static builds served from a different origin)
    BASE_URL = String(window.SCOREBOARD_API_BASE).replace(/\/$/, '');
  } else if (typeof window !== 'undefined') {
    // Fallback to a sensible default when the SPA is served statically (e.g., via Apache).
    // Use hostname + :8000 (backend) which matches the example frontend behaviour and avoids hitting the static file server for API calls.
    const hostname = (window.location && window.location.hostname) || 'localhost';
    const detected = `http://${hostname || 'localhost'}:8000`;
    try {
      // Validate URL
      new URL(detected);
      BASE_URL = detected.replace(/\/$/, '');
    } catch (e) {
      console.warn('API: Fallback baseURL invalid, using relative paths', detected, e);
      BASE_URL = '';
    }
  } else {
    // No window (server-side), keep empty
    BASE_URL = '';
  }

  /**
   * Generieke API call functie
   * @param {string} endpoint - API endpoint (bijv. '/api/activities')
   * @param {object} options - Fetch options (method, body, headers, etc.)
   * @returns {Promise} Response data
   */
  async function apiCall(endpoint, options = {}) {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`,
        );
      }

      // Check if response has content
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return null;
    } catch (e) {
      error.value = e.message;
      console.error("API Error:", e);
      throw e;
    } finally {
      loading.value = false;
    }
  }

  /**
   * GET request
   */
  async function get(endpoint) {
    return await apiCall(endpoint, { method: "GET" });
  }

  /**
   * POST request
   */
  async function post(endpoint, data) {
    return await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async function put(endpoint, data) {
    return await apiCall(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async function del(endpoint) {
    return await apiCall(endpoint, { method: "DELETE" });
  }

  return {
    loading,
    error,
    apiCall,
    get,
    post,
    put,
    del,
  };
}
