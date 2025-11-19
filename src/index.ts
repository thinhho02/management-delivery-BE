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

const PORT = process.env.PORT || 5000;

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
app.use(cors({
    origin: async function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        const pathFE = process.env.ORIGIN_PATH_FRONTEND
        console.log(pathFE)
        const whitelist = ["http://localhost:3000", pathFE]
        if (whitelist.includes(origin)) {
            callback(null, true);
        } else {
            console.log("❌ CORS blocked:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(cookieParser(process.env.SECRET_KEY_COOKIE))


initSocket(server)
// routers
app.use("/api", routes)

// Error Handler
app.use(errorHandler)

// run server
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`server & socket running listen port ${PORT}`)
    })
}).catch(error => {
    console.log(`error server`);
    process.exit(1)
})