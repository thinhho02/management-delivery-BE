import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from 'dotenv';
import shrinkRay from "shrink-ray-current";
// import zlib from "zlib";

import connectDB from "@/config/db.js";
import errorHandler from "@/middlewares/errorHanler.js";
import routes from "@/routes/routers.js";
import http from "http";
// import { Server } from "socket.io";
import { initSocket } from "./socket/index.js";

// environment config
dotenv.config({
    path: `.env.${process.env.NODE_ENV}`
});

// config
const app = express()
const server = http.createServer(app)
app.set("trust proxy", 1);
app.use(shrinkRay({
    filter: (req, res) => {
        if (req.headers["x-no-compress"]) return false;
        return shrinkRay.filter(req, res);
    },
    threshold: 50 * 1024,
    brotli: {
        mode: 1,
        quality: 6
    },
    zlib: { level: 6 },
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SECRET_KEY_COOKIE))
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
const portServer = 5000
const portSocket = 5001



initSocket(server)
// routers
app.use("/api", routes)

// Error Handler
app.use(errorHandler)

// run server
connectDB().then(() => {
    app.listen(portServer, () => {
        console.log(`server app running listen port ${portServer}`);
    })
    server.listen(portSocket, () => {
        console.log(`socket running listen port ${portSocket}`)
    })
}).catch(error => {
    console.log(`error server`);
    process.exit(1)
})