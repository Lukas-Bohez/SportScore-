import { ref, onMounted, onUnmounted } from "vue";
import { io } from "socket.io-client";

let socket = null;

export function useSocket() {
  const isConnected = ref(false);

  const connect = () => {
    if (socket && socket.connected) {
      console.log("♻️ Socket already connected:", socket.id);
      return socket;
    }

    if (socket) {
      console.log("♻️ Socket exists but not connected, reusing...");
      return socket;
    }

    // Allow using a relative origin when VITE_API_URL is not set so dev proxy can handle socket.io
    const envBase = import.meta.env.VITE_API_URL || '';
    const socketUrl = envBase || undefined; // undefined => connect to current origin
    console.log("🔌 Creating new socket connection to:", socketUrl || 'current origin');

    socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

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
