// Shared utilities for consistent behavior across components
class SharedUtils {
  constructor(api) {
    this.api = api;
  }

  /**
   * Standardized form submission handler with error handling
   * @param {Event} e - Form submit event
   * @param {Object} fieldConfig - Field configuration for extractFormData
   * @param {Function} createFunction - API function to call (e.g., this.api.createTeam)
   * @param {Function} successCallback - Callback for success (receives result data)
   * @param {Object} context - Context data for error messages
   */
  async handleFormSubmit(e, fieldConfig, createFunction, successCallback, context = {}) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = this.api.extractFormData(formData, fieldConfig);

    // Validate required fields
    const requiredFields = Object.keys(fieldConfig).filter(key => fieldConfig[key].required);
    const missingFields = this.api.validateRequired(data, requiredFields);

    if (missingFields.length > 0) {
      alert(`De volgende velden zijn verplicht: ${missingFields.join(', ')}`);
      return;
    }

    try {
      const result = await createFunction(data);
      successCallback(result, data);
    } catch (error) {
      const errorMessage = this.api.getErrorMessage(error, context.operation || 'operation', {
        name: data.name,
        ...context
      });
      alert(errorMessage);
      this.api.handleError(error, context.operation || 'operation');
    }
  }

  /**
   * Return whether lower values are better for the provided activity.
   * - For `team_vs_time` uses the activity.time_winner ('lower'|'higher')
   * - Otherwise falls back to checking for 'golf' in game_type/scoring_mode
   * @param {Object} activity
   * @returns {boolean}
   */
  static isLowerBetter(activity) {
    if (!activity) return false;
    const gameType = String(activity.game_type || '').toLowerCase();
    if (gameType === 'team_vs_time') {
      return String(activity.time_winner || 'lower').toLowerCase() === 'lower';
    }
    return (gameType + '|' + String(activity.scoring_mode || '')).toLowerCase().includes('golf');
  }

  isLowerBetter(activity) { return SharedUtils.isLowerBetter(activity); }

  /**
   * Parse a time string ("MM:SS(.ms)", "SS(.ms)", or seconds like "83.45") into integer milliseconds.
   * Returns integer milliseconds or NaN if invalid.
   */
  static parseTimeToMs(str) {
    if (str == null) return NaN;
    const s = String(str).trim();
    if (s === '') return NaN;

    // MM:SS(.ms)
    if (s.includes(':')) {
      const parts = s.split(':');
      if (parts.length !== 2) return NaN;
      const mins = parseInt(parts[0]);
      const secs = parseFloat(parts[1]);
      if (isNaN(mins) || isNaN(secs)) return NaN;
      return Math.round((mins * 60 + secs) * 1000);
    }

    // Plain numeric -> interpret as seconds (supports fractional seconds)
    const asFloat = parseFloat(s);
    if (!isNaN(asFloat)) {
      return Math.round(asFloat * 1000);
    }

    return NaN;
  }

  parseTimeToMs(str) { return SharedUtils.parseTimeToMs(str); }

  /**
   * Format milliseconds to "M:SS.mmm" string (minutes:seconds.milliseconds)
   */
  static formatMs(ms) {
    if (ms == null || isNaN(ms)) return '';
    const totalMs = Number(ms);
    const sign = totalMs < 0 ? '-' : '';
    const abs = Math.abs(totalMs);
    const minutes = Math.floor(abs / 60000);
    const seconds = Math.floor((abs % 60000) / 1000);
    const milliseconds = abs % 1000;
    const secStr = String(seconds).padStart(2, '0');
    const msStr = String(milliseconds).padStart(3, '0');
    return `${sign}${minutes}:${secStr}.${msStr}`;
  }

  formatMs(ms) { return SharedUtils.formatMs(ms); }

  /**
   * Standardized edit handler for finding and displaying items
   * @param {string} itemType - Type of item ('team', 'activity', 'player')
   * @param {number} itemId - ID of the item to edit
   * @param {Function} getFunction - API function to get items
   * @param {Function} showFormFunction - Function to show the edit form
   */
  async handleEdit(itemType, itemId, getFunction, showFormFunction) {
    try {
      const response = await getFunction();
      const item = this.api.findById(response, `${itemType}s`, itemId);
      if (item) {
        showFormFunction(item);
      } else {
        alert(`${itemType} niet gevonden.`);
      }
    } catch (error) {
      console.error(`Error loading ${itemType} for edit:`, error);
      alert(`Fout bij laden ${itemType} voor bewerking.`);
    }
  }

  /**
   * Standardized delete handler with confirmation
   * @param {string} itemType - Type of item ('team', 'activity', 'player')
   * @param {number} itemId - ID of the item to delete
   * @param {Function} deleteFunction - API function to delete the item
   * @param {Function} successCallback - Callback after successful deletion
   */
  async handleDelete(itemType, itemId, deleteFunction, successCallback) {
    const itemName = itemType.charAt(0).toUpperCase() + itemType.slice(1);
    if (!confirm(`Weet je zeker dat je deze ${itemType} wilt verwijderen?`)) return;

    try {
      await deleteFunction(itemId);
      if (successCallback) successCallback();
    } catch (error) {
      console.error(`Error deleting ${itemType}:`, error);
      alert(`Fout bij verwijderen ${itemType}.`);
    }
  }

  /**
   * Load data with consistent error handling
   * @param {Function} apiFunction - API function to call
   * @param {string} arrayKey - Key for the array in response
   * @param {Function} successCallback - Callback with loaded data
   * @param {Function} errorCallback - Optional error callback
   */
  async loadData(apiFunction, arrayKey, successCallback, errorCallback = null) {
    try {
      const response = await apiFunction();
      const data = this.api.extractArray(response, arrayKey);
      successCallback(data);
    } catch (error) {
      console.error(`Error loading ${arrayKey}:`, error);
      if (errorCallback) {
        errorCallback(error);
      }
    }
  }

  /**
   * Attach color input and preview behaviour to elements
   * @param {Element|string} colorInput - Element or selector for <input type=color>
   * @param {Element|string} previewEl - Element or selector for preview display
   * @returns {Object} controller with setColor(color)
   */
  attachColorPreview(colorInput, previewEl) {
    const input = typeof colorInput === 'string' ? document.querySelector(colorInput) : colorInput;
    const preview = typeof previewEl === 'string' ? document.querySelector(previewEl) : previewEl;
    if (!input || !preview) return null;

    const update = (value) => {
      // Ensure visual parity with site CSS (explicit inline styles to avoid cascade issues)
      preview.style.backgroundColor = value;
      preview.style.padding = '10px 20px';
      preview.style.minWidth = '180px';
      preview.style.display = 'inline-flex';
      preview.style.alignItems = 'center';
      preview.style.justifyContent = 'center';
      preview.style.whiteSpace = 'nowrap';
      try {
        preview.textContent = String(value).toUpperCase();
      } catch (_) {}
    };

    const onInput = () => update(input.value);
    input.addEventListener('input', onInput);
    preview.addEventListener('click', () => input.click());

    // initialize
    update(input.value || '#3B82F6');

    return {
      setColor: (c) => update(c),
      detach: () => {
        input.removeEventListener('input', onInput);
        // not removing preview click to keep simple behaviour
      }
    };
  }
}

// Make it globally available
window.SharedUtils = SharedUtils;