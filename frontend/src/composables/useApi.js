import { ref } from "vue";

/**
 * Base API composable voor alle HTTP requests
 * Bevat gedeelde functionaliteit voor loading states, error handling en fetch calls
 */
export function useApi() {
  const loading = ref(false);
  const error = ref(null);

  // Backend URL - pas dit aan als nodig
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
