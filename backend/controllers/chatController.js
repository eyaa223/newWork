import db from '../config/db.js';

/* ================= CHATBOT ================= */

// 🔹 Poser une question
export const askChatbot = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: 'Question requise' });
    }

    // 🔹 Recherche dans la base
    const searchQuery = `SELECT answer 
                         FROM chatbot_questions 
                         WHERE question LIKE ? 
                         LIMIT 1`;

    const [results] = await db.execute(searchQuery, [`%${question}%`]);

    if (results.length > 0) {
      res.json({ answer: results[0].answer });
    } else {
      res.json({ answer: "Désolé, je n'ai pas de réponse pour cette question." });
    }

  } catch (err) {
    console.error('Erreur askChatbot:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};