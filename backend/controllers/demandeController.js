import db from '../config/db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// Config Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
});

// Config Multer
export const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './upload';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
export const upload = multer({ storage });

// 🔹 Créer une demande
export const createDemande = async (req, res) => {
  const { nom_association, email, telephone, adresse, responsable, categorie, description } = req.body;
  const files = req.files || {};

  // ✅ logo optionnel
  const logo = files['logo']?.[0]?.filename || null;

  // ✅ description obligatoire (pour affichage public)
  if (
    !nom_association ||
    !email ||
    !telephone ||
    !adresse ||
    !responsable ||
    !categorie ||
    !description ||
    !files['doc_statut'] ||
    !files['doc_autorisation'] ||
    !files['doc_registre'] ||
    !files['doc_cin']
  ) {
    return res.status(400).json({
      message: "Tous les champs et documents sont obligatoires (catégorie + description incluses)",
    });
  }

  try {
    const [exist] = await db.execute('SELECT id FROM demandes_association WHERE email = ?', [email]);
    if (exist.length > 0) {
      return res.status(400).json({ message: 'Cette association a déjà envoyé une demande' });
    }

    const [result] = await db.execute(
      `INSERT INTO demandes_association 
      (nom_association,email,telephone,adresse,responsable,categorie,description,logo,doc_statut,doc_autorisation,doc_registre,doc_cin,statut_admin,statut_avocat)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'en attente','en attente')`,
      [
        nom_association,
        email,
        telephone,
        adresse,
        responsable,
        categorie,
        description,
        logo,
        files['doc_statut'][0].filename,
        files['doc_autorisation'][0].filename,
        files['doc_registre'][0].filename,
        files['doc_cin'][0].filename,
      ]
    );

    const demandeId = result.insertId;

    // Notifications
    const notifMsg = `Nouvelle demande reçue de l'association "${nom_association}"`;
    await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
      demandeId,
      'demande_ajoute_admin',
      notifMsg,
    ]);
    await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
      demandeId,
      'demande_ajoute_avocat',
      notifMsg,
    ]);

    res.status(201).json({ message: 'Demande envoyée avec succès', demandeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Voir toutes les demandes
export const getAllDemandes = async (req, res) => {
  if (!['avocat', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM demandes_association ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Modifier statut
export const updateStatut = async (req, res) => {
  const { statut_avocat, statut_admin } = req.body;
  const id = req.params.id;

  try {
    // 🔹 Statut avocat
    if (req.user.role === 'avocat' && statut_avocat) {
      await db.execute('UPDATE demandes_association SET statut_avocat = ? WHERE id = ?', [statut_avocat, id]);

      const [demande] = await db.execute('SELECT nom_association FROM demandes_association WHERE id = ?', [id]);
      const message = `Avocat a changé le statut de "${demande?.[0]?.nom_association}" en ${statut_avocat}`;
      await db.execute('INSERT INTO notification (demande_id, type, message) VALUES (?, ?, ?)', [
        id,
        'statut_avocat',
        message,
      ]);

      return res.json({ message: 'Statut avocat mis à jour et notification créée' });
    }

    // 🔹 Statut admin
    if (req.user.role === 'admin' && statut_admin) {
      await db.execute('UPDATE demandes_association SET statut_admin = ? WHERE id = ?', [statut_admin, id]);

      if (statut_admin === 'acceptee') {
        const [rows] = await db.execute('SELECT * FROM demandes_association WHERE id = ?', [id]);
        const demande = rows[0];
        if (!demande) return res.status(404).json({ message: 'Demande non trouvée' });

        const [exist] = await db.execute('SELECT id FROM associations WHERE email = ?', [demande.email]);
        if (exist.length === 0) {
          const generatedPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);

          // ✅ On copie categorie + logo + description vers associations
          await db.execute(
            `INSERT INTO associations (nom, email, password, telephone, adresse, responsable, categorie, logo, description)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
              demande.nom_association,
              demande.email,
              hashedPassword,
              demande.telephone,
              demande.adresse,
              demande.responsable,
              demande.categorie || 'other',
              demande.logo || null,
              demande.description || null,
            ]
          );

          await transporter.sendMail({
            from: process.env.EMAIL,
            to: demande.email,
            subject: 'Association acceptée ✅',
            text: `Bonjour ${demande.nom_association},\n\nVotre demande a été acceptée par l'admin.\nEmail : ${demande.email}\nMot de passe : ${generatedPassword}`,
          });
        }
      }

      return res.json({ message: 'Statut admin mis à jour et compte créé si accepté' });
    }

    return res.status(403).json({ message: 'Accès refusé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Télécharger fichier
export const downloadFile = async (req, res) => {
  const { id, field } = req.params;

  // ✅ logo autorisé aussi
  if (!['doc_statut', 'doc_autorisation', 'doc_registre', 'doc_cin', 'logo'].includes(field)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM demandes_association WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Demande non trouvée' });
    if (!['avocat', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Accès refusé' });

    const fileName = rows[0][field];
    if (!fileName) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable' });

    res.download(filePath, fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};