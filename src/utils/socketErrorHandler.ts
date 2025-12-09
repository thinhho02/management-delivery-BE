import type { Socket } from "socket.io";

export const socketErrorHandler = (socket: Socket, fn: (...args: any[]) => any) => {
  return (...args: any[]) => {
    try {
      fn(...args);
    } catch (err) {
      console.log(err)
      socket.emit("error", (err as Error).message);
    }
  };
};
