import type { Socket } from "socket.io";

export const socketErrorHandler = (socket: Socket, fn: (...args: any[]) => any) => {
  return (...args: any[]) => {
    Promise.resolve(fn(...args)).catch((err) => {
      console.error("Socket Error:", (err as Error).message);
      socket.emit("error", (err as Error).message);
    });
  };
};
