// Socket.io client — `onSnapshot` o'rnida realtime eventlarini olish uchun.
// Avtomatik token bilan ulanadi, disconnect bo'lganda qayta urinib ko'radi.

"use client";

import { io, Socket } from "socket.io-client";
import { tokenStore } from "./client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  // Token bo'lmasa ulanmaymiz
  const token = tokenStore.get();
  if (!token) return null;

  // Mavjud socketni QAYTA ISHLATAMIZ — token o'zgarmagan bo'lsa, hatto hali
  // "connecting" holatida bo'lsa ham. Avval har chaqiruvda `connected` bo'lmasa
  // socket o'chirilib qayta yaratilardi; natijada bir effektda ro'yxatdan
  // o'tgan bir nechta handler (masalan submission.created/updated/deleted)
  // o'lik socketlarda qolib, realtime eventlar yetib kelmasdi.
  if (socket && socketToken === token) return socket;

  // Token o'zgargan (qayta login) yoki socket yo'q — eskisini yopib qayta ulanamiz
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect_error:", err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketToken = null;
}

/** Real-time event'ga obuna bo'lish — unsubscribe funksiyasini qaytaradi. */
export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on(event, handler as (...args: unknown[]) => void);
  return () => {
    s.off(event, handler as (...args: unknown[]) => void);
  };
}
