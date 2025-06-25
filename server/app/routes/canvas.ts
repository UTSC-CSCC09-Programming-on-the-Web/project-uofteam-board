import Router from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
export const canvasRouter = Router();
const pool = new Pool();

// get all canvas correspond owned by userId
canvasRouter.get("/", (req, res) => {
        
});

// create new  
canvasRouter.post("/", (req, res) => {
    
});
