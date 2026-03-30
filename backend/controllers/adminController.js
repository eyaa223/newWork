import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { sendEmail } from './emailController.js'; // pour l’envoi email

/* ===========================
   🔹 LOGIN
=========================== */
export const login = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) return res.status(400).json({ message: 'Email et mot de passe requis' });

  try {
    // 🔹 Table utilisateurs
    const [users] = await db.execute('SELECT * FROM utilisateurs WHERE email = ?', [email]);

    if (users.length > 0) {
      const user = users[0];

      const match = await bcrypt.compare(mot_de_passe.trim(), user.mot_de_passe);

      if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

      const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.json({
        message: 'Connexion réussie',
        token,
        role: user.role,
        email: user.email,
      });
    }

    // 🔹 Table associations
    const [assoc] = await db.execute('SELECT * FROM associations WHERE email = ?', [email]);

    if (assoc.length > 0) {
      const association = assoc[0];

      if (association.blocked === 1)
        return res.status(403).json({
          message: "Vous êtes bloqué. Contactez l'admin.",
        });

      const match = await bcrypt.compare(mot_de_passe.trim(), association.password);

      if (!match) return res.status(401).json({ message: 'Mot de passe incorrect' });

      const token = jwt.sign({ id: association.id, role: 'association' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.json({
        message: 'Connexion réussie',
        token,
        role: 'association',
        association: {
          id: association.id,
          nom: association.nom,
          email: association.email,
        },
      });
    }

    return res.status(401).json({ message: 'Utilisateur non trouvé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 GET Associations
=========================== */
export const getAssociations = async (req, res) => {
  const search = req.query.search || '';
  const likeSearch = `%${search}%`;

  try {
    const [associations] = await db.execute(
      `SELECT *
       FROM associations
       WHERE nom LIKE ? OR email LIKE ? OR telephone LIKE ?
       ORDER BY created_at DESC`,
      [likeSearch, likeSearch, likeSearch],
    );

    res.json(associations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 Block / Unblock
=========================== */
export const blockAssociation = async (req, res) => {
  const { id } = req.params;
  const { blocked } = req.body;

  try {
    await db.execute('UPDATE associations SET blocked = ? WHERE id = ?', [blocked ? 1 : 0, id]);

    res.json({
      message: `Association ${blocked ? 'bloquée' : 'débloquée'} avec succès`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 GET Donneurs  ✅ (avec montant_total)
   - montant_total = SUM(donations.montant) par donneur
   - on suppose que donations.donneur_id référence utilisateurs.id (donneur)
   ⚠️ Si ta FK est différente, dis-moi son nom exact et je te corrige la requête.
=========================== */
export const getDonneurs = async (req, res) => {
  try {
    const [donneurs] = await db.execute(
      `SELECT 
          u.id,
          u.nom,
          u.email,
          u.date_creation,
          COALESCE(SUM(d.montant), 0) AS montant_total
       FROM utilisateurs u
       LEFT JOIN donations d
         ON d.donneur_id = u.id
       WHERE u.role = 'donneur'
       GROUP BY u.id, u.nom, u.email, u.date_creation
       ORDER BY u.date_creation DESC`,
    );

    res.json(donneurs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ===========================
   🔹 GET Beneficiaires
=========================== */
export const getBeneficiaires = async (req, res) => {
  try {
    const [beneficiaires] = await db.execute(
      `SELECT 
          b.id,
          b.nom,
          b.prenom,
          b.email,
          b.password,
          b.telephone,
          b.adresse,
          b.description,
          b.cin,
          b.date_naissance,
          b.genre,
          b.situation_familiale,
          b.montant_a_collecter,
          b.montant_restant,
          b.association_id,
          b.created_at,
          b.updated_at,
          a.nom AS association_nom
       FROM beneficiaires b
       LEFT JOIN associations a ON b.association_id = a.id
       ORDER BY a.nom, b.nom`,
    );

    res.json(beneficiaires);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const createAvocat = async (req, res) => {
  try {
    const { nom, email } = req.body;

    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès interdit' });

    // Vérifier email unique
    const [exist] = await db.execute('SELECT id FROM utilisateurs WHERE email = ?', [email]);
    if (exist.length > 0) return res.status(400).json({ message: 'Email déjà utilisé' });

    // Générer token sécurisé
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 3600000); // 1h

    // Ajouter l’avocat sans mot de passe
    await db.execute(
      `INSERT INTO utilisateurs (nom, email, role, reset_token, reset_token_expiration, date_creation)
       VALUES (?, ?, 'avocat', ?, ?, NOW())`,
      [nom, email, token, expiration],
    );

    const link = `http://localhost:3000/set-password/${token}`;

    await sendEmail(
      email,
      'Définir votre mot de passe',
      `
      <h2>Bienvenue</h2>
      <p>Cliquez sur le lien pour définir votre mot de passe :</p>
      <a href="${link}">${link}</a>
      <p>Ce lien expire dans 1 heure.</p>
    `,
    );

    res.status(201).json({ message: 'Avocat créé et email envoyé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};