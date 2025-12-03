import { socketErrorHandler } from "@/utils/socketErrorHandler.js";
import type { Server, Socket } from "socket.io";
import z from "zod";

const SchemaSocketNotify = z.object({
    sessionId: z.string("Missing session")
})

export const notifySession = (io: Server, socket: Socket) => {
    socket.on("join:room_session", socketErrorHandler(socket, (payload) => {
        const pickSessionId = SchemaSocketNotify.pick({ sessionId: true })
        const { sessionId } = pickSessionId.parse(payload)
        const roomName = `session:${sessionId}`;
        socket.join(roomName)
        console.log(`Socket ${socket.id} joined room ${sessionId}`);
        console.log(io.sockets.adapter.rooms);
    }))
}

