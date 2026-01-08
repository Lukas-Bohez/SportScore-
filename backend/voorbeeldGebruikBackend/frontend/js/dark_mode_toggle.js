// Dark Mode Toggle Script - Standalone JS (inject via console/bookmarklet/Tampermonkey)
// Configurable variables
const config = {
  buttonPosition: { bottom: '20px', right: '20px' },
  buttonSize: '50px',
  buttonBorderRadius: '50%',
  buttonBackground: 'rgba(0,0,0,0.7)',
  buttonColor: '#fff',
  buttonHoverBackground: 'rgba(0,0,0,0.9)',
  transitionDuration: '0.3s',
  darkVars: {
    // General dark mode variables for overrides
    '--bg': '#1a1a1a',
    '--text': '#ffffff',
    '--border': '#404040',
    '--button-bg': '#333',
    '--button-text': '#fff',
    '--input-bg': '#2a2a2a',
    '--input-border': '#555',
    '--link': '#4dabf7',
    '--shadow': 'rgba(255,255,255,0.1)',
    // Themes.css variables
    '--theme-primary': '#4dabf7',
    '--theme-secondary': '#1976d2',
    '--theme-background': 'linear-gradient(135deg, #4dabf7 0%, #1976d2 100%)',
    '--theme-text': '#ffffff',
    '--theme-accent': '#ffffff',
    // Common variables
    '--background-color': '#1a1a1a',
    '--text-color': '#ffffff',
    '--text-secondary': '#cccccc',
    '--border-color': '#404040',
    '--card-bg': '#2c2c2c',
    '--primary-color': '#4dabf7',
    '--secondary-color': '#8e9297',
    '--success-color': '#4caf50',
    '--danger-color': '#f44336',
    '--warning-color': '#ff9800',
    '--info-color': '#00bcd4',
    '--light-color': '#424242',
    '--dark-color': '#212121',
    '--shadow-color': 'rgba(0,0,0,0.3)',
    '--button-primary-bg': '#1976d2',
    '--button-primary-text': '#ffffff',
    '--button-secondary-bg': '#757575',
    '--button-secondary-text': '#ffffff',
    '--input-bg': '#2a2a2a',
    '--input-border': '#555555',
    '--input-text': '#ffffff',
    '--link-color': '#e0e0e0',
    '--link-hover': '#2196f3',
    '--border-radius': '8px',
    '--transition': 'all 0.3s ease',
    // Scoreinput.css variables (same as common)
    '--card-background': '#2c2c2c',
    '--text-primary': '#e0e0e0',
    '--accent-color': '#ec7063',
    '--success-color': '#58d68d',
    '--warning-color': '#f7dc6f',
    '--danger-color': '#ec7063',
    '--gold-color': '#d4af37',
    '--gold-hover': '#b8860b',
  },
  storageKey: 'darkModeEnabled',
};

// Inject CSS variables and styles
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .dark-mode {
      ${Object.entries(config.darkVars)
        .map(([k, v]) => `${k}: ${v};`)
        .join(' ')}
    }
    .dark-mode body {
      background: var(--background-color);
      color: var(--text-color);
    }
    .dark-mode .header {
      background: #404040 !important;
    }
    .dark-mode input, .dark-mode select, .dark-mode textarea {
      background: var(--input-bg);
      color: var(--text-color);
      border-color: var(--input-border);
    }
    .dark-mode a:not(.nav-link):not(.admin-link a) {
      color: var(--link-color);
    }
    .dark-mode-toggle {
      position: fixed;
      bottom: ${config.buttonPosition.bottom};
      right: ${config.buttonPosition.right};
      width: ${config.buttonSize};
      height: ${config.buttonSize};
      border-radius: ${config.buttonBorderRadius};
      background: ${config.buttonBackground};
      color: ${config.buttonColor};
      border: none;
      cursor: pointer;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background ${config.transitionDuration};
      z-index: 9999;
      box-shadow: 0 2px 10px var(--shadow);
    }
    .dark-mode-toggle:hover {
      background: ${config.buttonHoverBackground};
    }
  `;
  document.head.appendChild(style);
}

// Create and inject toggle button
function createToggleButton() {
  const button = document.createElement('button');
  button.className = 'dark-mode-toggle';
  button.innerHTML = '🌙'; // Moon icon for light mode
  button.title = 'Toggle Dark Mode';
  button.onclick = toggleDarkMode;
  document.body.appendChild(button);
  return button;
}

// Apply theme
function applyTheme(isDark) {
  const target = document.documentElement;
  if (isDark) {
    target.classList.add('dark-mode');
  } else {
    target.classList.remove('dark-mode');
  }
  updateButtonIcon(isDark);
}

// Update button icon
function updateButtonIcon(isDark) {
  const button = document.querySelector('.dark-mode-toggle');
  if (button) {
    button.innerHTML = isDark ? '☀️' : '🌙';
  }
}

// Toggle dark mode
function toggleDarkMode() {
  const isDark = !document.documentElement.classList.contains('dark-mode');
  applyTheme(isDark);
  localStorage.setItem(config.storageKey, isDark);
}

// Check system preference
function getSystemPreference() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  injectStyles();

  // Only show toggle button on pages except index
  const currentPage = window.location.pathname.split('/').pop();
  console.log('Current page:', currentPage);
  if (currentPage !== 'index.html' && currentPage !== '') {
    const button = createToggleButton();

    // Check localStorage first, then system preference
    let isDark = localStorage.getItem(config.storageKey);
    if (isDark === null) {
      isDark = getSystemPreference();
      localStorage.setItem(config.storageKey, isDark);
    } else {
      isDark = isDark === 'true';
    }

    applyTheme(isDark);

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem(config.storageKey) === null) {
          applyTheme(e.matches);
        }
      });
    }

    // MutationObserver for dynamic content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Reapply styles to new elements if needed
              // For simplicity, rely on CSS inheritance
            }
          });
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    // For other pages, still apply the theme if set
    let isDark = localStorage.getItem(config.storageKey);
    if (isDark === null) {
      isDark = getSystemPreference();
    } else {
      isDark = isDark === 'true';
    }
    applyTheme(isDark);
  }
}
