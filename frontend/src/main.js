// Runtime API base helper — prioritizes explicit VITE_API_URL (build-time), falls back to any server-injected window variable, otherwise computes host-based fallback
if (typeof window !== 'undefined') {
  window.SCOREBOARD_API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, '')
    : (window.SCOREBOARD_API_BASE ? String(window.SCOREBOARD_API_BASE).replace(/\/$/, '') : (typeof window !== 'undefined' && window.location ? (window.location.protocol + '//' + window.location.hostname + ':8000') : ''));
}

import "./assets/main.css";
import "element-plus/dist/index.css";

import { createApp } from "vue";
import ElementPlus from "element-plus";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(router);
app.use(ElementPlus);

// Admin presence + socket integration
// Emit admin presence when a non-bigscreen client connects so the backend can hide QR
// and keep track of active admins. This runs once on app startup and listens for
// reconnects to emit presence again.
try {
  // Dynamically import to avoid changing SSR behavior
  import('./composables/useSocket').then(({ useSocket }) => {
    const { connect, emit, on } = useSocket();
    try {
      connect();
    } catch (e) {
      console.warn('Socket connect failed in main:', e);
    }

    const isBigscreen = () => {
      try {
        const h = window.location.hash || '';
        const p = window.location.pathname || '';
        return h.startsWith('#/bigscreen') || p.indexOf('/bigscreen') === 0;
      } catch (e) {
        return false;
      }
    };

    // On socket connect, tell the server we are an admin client if not a bigscreen
    on('connect', () => {
      try {
        if (!isBigscreen()) {
          emit('admin_connected');
          console.log('Admin presence: emitted admin_connected');
        }
      } catch (e) {
        console.warn('Failed to emit admin_connected:', e);
      }
    });

    // On unload, notify server we are leaving
    try {
      window.addEventListener('beforeunload', () => {
        try {
          if (!isBigscreen()) {
            emit('admin_disconnected');
          }
        } catch (e) {}
      });
    } catch (e) {}
  });
} catch (e) {
  console.warn('Admin presence setup failed:', e);
}

// Handle hash-based deep links gracefully when the server does not support history-mode
// (e.g. kiosk using http://sportscore.local/#/bigscreen/...). When the app boots, translate
// the hash path into a proper history navigation so the router loads the requested view.
router.isReady().then(() => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/')) {
      const path = hash.replace(/^#/, '');
      if (router.currentRoute.value.path !== path) {
        router.replace(path).catch(() => {});
      }
    }

    // If router didn't match any route (server served this file for a history URL) and
    // the path looks like a known SPA deep-link (e.g. /bigscreen/...), rewrite to a hash URL
    // and reload so the hash-based fallback works on servers without proper history-mode support.
    try {
      const currentPath = window.location.pathname || '/';
      const matched = (router.currentRoute && router.currentRoute.value && (router.currentRoute.value.matched || []).length > 0);
      if (!matched) {
        // Only touch known SPA prefixes to be conservative
        const SPA_PREFIXES = ['/bigscreen', '/session', '/game', '/nieuwesessie', '/sessionmanagment'];
        const prefixMatch = SPA_PREFIXES.find(p => currentPath.startsWith(p));
        if (prefixMatch) {
          const newUrl = `${window.location.origin}/#${currentPath}${window.location.search || ''}`;
          console.warn('Unmatched history URL detected; rewriting to hash fallback ->', newUrl);
          window.location.replace(newUrl);
        }
      }
    } catch (e) {
      // do not break startup if this logic fails
      console.warn('History->hash fallback check failed:', e);
    }
  }
}).catch(() => {});

app.mount("#app");
