import { socketErrorHandler } from "@/utils/socketErrorHandler.js";
import { Server, type Socket } from "socket.io";
import http from "http";
import { notifySession } from "./notifySession.js";


export let io: Server;

export const initSocket = (server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        },
    })
    io.on("connection", (socket: Socket) => {

        console.log(`New client connected: ${socket.id}`);
        notifySession(io, socket)
        // socket.on("reconnect", socketErrorHandler(socket, (payload) => {
        //     const { creator } = SchemaSocketComment.parse(payload)
        //     socket.join(creator);
        //     console.log(`Socket ${socket.id} joined room ${creator}`);
        //     console.log(io.sockets.adapter.rooms);
        // }));
        // socket.on("join_creator_room", socketErrorHandler(socket, (payload) => {
        //     const { creator } = SchemaSocketComment.parse(payload)
        //     socket.join(creator);
        //     console.log(`Socket ${socket.id} joined room ${creator}`);
        //     console.log(io.sockets.adapter.rooms);
        // }));

        // socket.on("leave_creator_room", socketErrorHandler(socket, (payload) => {
        //     const { creator } = SchemaSocketComment.parse(payload)

        //     socket.leave(creator);
        //     console.log(`Socket ${socket.id} leave room ${creator}`);
        //     console.log(io.sockets.adapter.rooms);
        // }));

        // socket.on("new_comment_server", socketErrorHandler(socket, (payload) => {
        //     const { creator, comment } = SchemaSocketComment.parse(payload)

        //     console.log(`roadcasting to room ${creator}`);
        //     io.to(creator).emit("new_comment_client", comment);
        // }));

        socket.on("disconnect", () => {
            console.log(`Socket ${socket.id} disconnected`);
            console.log(io.sockets.adapter.rooms);

        });

    });
};