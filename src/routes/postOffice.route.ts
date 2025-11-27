import { createNewPost, getPostById, getPostOffices, getZonebyType, updatePost } from "@/controllers/postOffice.controller.js";
import { Router } from "express";

const routePostOffice = Router()

// /post-office
routePostOffice.get("/type-post/:type", getZonebyType) // verify Admin
routePostOffice.get("/", getPostOffices) // verify Admin
routePostOffice.get("/:postId", getPostById)
routePostOffice.post("/create", createNewPost) // verify Admin

routePostOffice.put("/update/:postId", updatePost)



export default routePostOffice