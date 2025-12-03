import { socketErrorHandler } from "@/utils/socketErrorHandler.js";
import type { Server, Socket } from "socket.io";
import z from "zod";

const SchemaSocketPost = z.object({
    postId: z.string().min(1, "Missing PostId"),
    shipperId: z.string().min(1, "Missing ShipperId"),
    businessId: z.string().min(1, "Missing BusinessId"),
})

export const employeeJoinPost = (io: Server, socket: Socket) => {
    socket.on("join:post_join", socketErrorHandler(socket, (payload) => {
        const pickPostId = SchemaSocketPost.pick({ postId: true })
        const { postId } = pickPostId.parse(payload)
        const roomName = `post_office:${postId}`;
        socket.join(roomName)
        console.log(`Socket ${socket.id} joined room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }))

    socket.on("leave:post_join", socketErrorHandler(socket, (payload) => {
        const pickPostId = SchemaSocketPost.pick({ postId: true });
        const { postId } = pickPostId.parse(payload);

        const roomName = `post_office:${postId}`;
        socket.leave(roomName);

        console.log(`Socket ${socket.id} left room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }));
}

export const employeeJoinShipper = (io: Server, socket: Socket) => {
    socket.on("join:shipper_join", socketErrorHandler(socket, (payload) => {
        const pickShipperId = SchemaSocketPost.pick({ shipperId: true })
        const { shipperId } = pickShipperId.parse(payload)
        const roomName = `shipper:${shipperId}`;
        socket.join(roomName)
        console.log(`Socket ${socket.id} joined room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }))

    socket.on("leave:shipper_join", socketErrorHandler(socket, (payload) => {
        const pickShipperId = SchemaSocketPost.pick({ shipperId: true })
        const { shipperId } = pickShipperId.parse(payload)
        const roomName = `shipper:${shipperId}`;
        socket.leave(roomName);

        console.log(`Socket ${socket.id} left room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }));
}


export const businessJoin = (io: Server, socket: Socket) => {
    socket.on("join:business_join", socketErrorHandler(socket, (payload) => {
        const pickBusinessId = SchemaSocketPost.pick({ businessId: true })
        const { businessId } = pickBusinessId.parse(payload)
        const roomName = `business:${businessId}`;
        socket.join(roomName)
        console.log(`Socket ${socket.id} joined room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }))

    socket.on("leave:business_join", socketErrorHandler(socket, (payload) => {
        const pickBusinessId = SchemaSocketPost.pick({ businessId: true })
        const { businessId } = pickBusinessId.parse(payload)
        const roomName = `business:${businessId}`;
        socket.leave(roomName);

        console.log(`Socket ${socket.id} left room ${roomName}`);
        console.log(io.sockets.adapter.rooms);
    }));
}