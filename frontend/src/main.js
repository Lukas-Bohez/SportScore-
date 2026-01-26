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

app.mount("#app");
