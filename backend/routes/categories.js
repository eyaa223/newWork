import express from "express";
import db from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // ✅ Vérifiez le NOM EXACT de la colonne dans votre table
    // Si la colonne s'appelle 'icon', 'image', 'image_url' ou 'img'
    const [rows] = await db.query(
      `SELECT 
        id, 
        value, 
        label, 
        COALESCE(img, icon, image_url, image) AS img  -- ✅ Essaie plusieurs noms de colonnes
       FROM categories 
       WHERE active = 1 
       ORDER BY ordre ASC, label ASC`
    );
    
    // ✅ Debug : affiche ce qu'on renvoie
    console.log('[GET /categories] Catégories renvoyées:', rows);
    
    res.json(rows);
  } catch (e) {
    console.error('[GET /categories] erreur:', e);
    res.status(500).json({ 
      message: "Erreur serveur",
      error: e.message 
    });
  }
});

export default router;