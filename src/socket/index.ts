import { socketErrorHandler } from "@/utils/socketErrorHandler.js";
import { Server, type Socket } from "socket.io";
import http from "http";
import { notifySession } from "./notifySession.js";
import { businessJoin, employeeJoinPost, employeeJoinShipper, orderJoin } from "./socketJoinRoom.js";


export let io: Server;

export const initSocket = (server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) => {

    io = new Server(server, {
        transports: ["websocket"],
        pingInterval: 25000,
        pingTimeout: 20000,
        cors: {
            origin: async function (origin, callback) {
                // Allow requests with no origin (mobile apps, curl, postman)
                if (!origin) return callback(null, true);

                const pathFE = process.env.ORIGIN_PATH_FRONTEND
                const whitelist = ["http://localhost:3000", pathFE]
                if (whitelist.includes(origin)) {
                    callback(null, true);
                } else {
                    console.log("❌ CORS blocked:", origin);
                    callback(new Error("Not allowed by CORS"));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
    })
    io.on("connection", (socket: Socket) => {

        console.log(`New client connected: ${socket.id}`);
        notifySession(io, socket)
        employeeJoinPost(io, socket)
        employeeJoinShipper(io, socket)
        businessJoin(io, socket)
        orderJoin(io, socket)
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