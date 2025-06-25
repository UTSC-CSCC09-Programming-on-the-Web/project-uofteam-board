import Router from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
export const authRouter = Router();
const pool = new Pool();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

authRouter.get("/google", (req, res) => {
    console.log("CLIENT_ID : ", CLIENT_ID);
    console.log("CLIENT_SECRET : ", CLIENT_SECRET);
    console.log("REDIRECT_URI : ", REDIRECT_URI);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code
        &scope=email%20profile&prompt=select_account`;
    res.redirect(authUrl);
});

authRouter.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false, 
  });
  res.redirect("http://localhost:5173");
});

authRouter.get("/google/callback", async (req, res) => {
    const code = req.query.code as string;
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
        params: {
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
        },
    });

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}`},
    });

    const { id: googleId, email, name } = userRes.data;
    const userCheck = await pool.query("SELECT id FROM users WHERE google_id = $1", [googleId]);
    let userId;
    if (userCheck.rows.length > 0) {
        userId = userCheck.rows[0].id;
    }
    else {
        const insertRes = await pool.query (
            "INSERT INTO users (google_id, email, name) VALUES ($1, $2, $3) RETURNING id",
            [googleId, email, name]  
        );
        userId = insertRes.rows[0].id;
    }   
    
    const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
    });

    res.redirect("http://localhost:5173/boards/mine");
});
