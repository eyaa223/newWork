import express from "express";
import db from "../config/db.js"; // adapte selon ton projet

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, value, label, icon FROM categories ORDER BY label ASC");
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;