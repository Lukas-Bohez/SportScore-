import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";

let socket = null;

export function useSocket() {
  const isConnected = ref(false);

  const connect = () => {
    if (socket && socket.connected) {
      console.log("♻️ Socket already connected:", socket.id);
      try { isConnected.value = true; } catch (_) {}
      try { if (typeof window !== 'undefined') window.SCOREBOARD_API_BASE = socket.io?.uri || socket.io?.opts?.path || socket.io?.opts?.hostname || undefined; } catch (_) {}
      return socket;
    }

    if (socket) {
      console.log("♻️ Socket exists but not connected, reusing...");
      try { isConnected.value = !!socket.connected; } catch (_) {}
      // Note: we'll still reuse the existing socket instance and event handlers
      return socket;
    }

    // Build a reliable socket URL: prefer explicit env/runtime settings; otherwise default to backend host on :8000 like the example frontend
    let socketUrl;
    const envBase = import.meta.env.VITE_API_URL;
    if (envBase) {
      socketUrl = envBase.replace(/\/$/, '');
    } else if (typeof window !== 'undefined' && window.SCOREBOARD_SOCKET_BASE) {
      socketUrl = String(window.SCOREBOARD_SOCKET_BASE).replace(/\/$/, '');
    } else if (typeof window !== 'undefined' && window.SCOREBOARD_API_BASE) {
      socketUrl = String(window.SCOREBOARD_API_BASE).replace(/\/$/, '');
    } else if (typeof window !== 'undefined') {
      const hostname = (window.location && window.location.hostname) || 'localhost';
      socketUrl = `http://${hostname || 'localhost'}:8000`;
    } else {
      socketUrl = undefined; // current origin
    }

    console.log("🔌 Creating new socket connection to:", socketUrl || 'current origin');

    // Prefer polling-first transport to be robust behind proxies; allow websocket if available
    socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      timeout: 30000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      autoConnect: true,
    });

    // Expose the API base URL so HTTP fallback can reach the same backend as the socket
    try { if (typeof window !== 'undefined' && socketUrl) window.SCOREBOARD_API_BASE = socketUrl; } catch (_) {}

    socket.on("connect", () => {
      console.log("✅ Socket.io connected:", socket.id);
      isConnected.value = true;
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket.io disconnected");
      isConnected.value = false;
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.io connection error:", error);
      isConnected.value = false;
      // client will continue retrying based on reconnection settings; no extra aggressive fallback needed
    });

    // Log all incoming events (single listener sufficient)
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Socket received event: ${eventName}`, args);
    });


    // Log all incoming events
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Socket received event: ${eventName}`, args);
    });

    return socket;
  };

  const emit = (event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
      console.log("📤 Socket emit:", event, data);
    } else {
      console.warn("⚠️ Socket not connected, cannot emit:", event);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      console.log("👂 Socket listening to:", event);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  };

  return {
    socket,
    isConnected,
    connect,
    emit,
    on,
    off,
    disconnect,
  };
}
