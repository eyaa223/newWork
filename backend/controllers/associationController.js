import db from '../config/db.js';
import path from 'path';
import fs from 'fs';

/* ================= ADMIN ================= */

// 🔹 Get all associations (admin)
export const getAllAssociations = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé : Admin uniquement' });
    }

    const [associations] = await db.execute(
      `SELECT id, nom, email, telephone, adresse, responsable, categorie, logo, description, blocked, created_at 
       FROM associations 
       ORDER BY created_at DESC`,
    );

    res.json(associations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= PUBLIC ================= */

// 🔹 Public list (avec filtres)
export const getPublicAssociations = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const searchPattern = `%${search}%`;

    const categoriesParam = (req.query.categories || '').trim();
    const categories = categoriesParam
      ? categoriesParam
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    let sql = `
      SELECT
        a.id,
        a.nom,
        a.email,
        a.telephone,
        a.adresse,
        a.categorie,
        a.logo,
        a.description,
        a.created_at,

        (SELECT COUNT(*) 
         FROM beneficiaires b 
         WHERE b.association_id = a.id) AS beneficiaries_count,

        (SELECT COALESCE(SUM(dbf.montant_a_collecter), 0)
         FROM demandes_beneficiaire dbf
         WHERE dbf.association_id = a.id) AS target_amount

      FROM associations a
      WHERE a.blocked = 0
        AND (
          a.nom LIKE ?
          OR a.adresse LIKE ?
          OR a.categorie LIKE ?
          OR COALESCE(a.description, '') LIKE ?
        )
    `;

    const params = [searchPattern, searchPattern, searchPattern, searchPattern];

    if (categories.length > 0) {
      sql += ` AND a.categorie IN (${categories.map(() => '?').join(',')}) `;
      params.push(...categories);
    }

    sql += ` ORDER BY a.created_at DESC`;

    const [rows] = await db.execute(sql, params);

    res.json(rows);
  } catch (err) {
    console.error('Erreur getPublicAssociations:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Public get by ID
export const getPublicAssociationById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT 
        a.id,
        a.nom,
        a.email,
        a.telephone,
        a.adresse,
        a.categorie,
        a.logo,
        a.description,
        a.created_at,

        (SELECT COUNT(*) 
         FROM beneficiaires b 
         WHERE b.association_id = a.id) AS beneficiaries_count,

        (SELECT COALESCE(SUM(dbf.montant_a_collecter),0)
         FROM demandes_beneficiaire dbf
         WHERE dbf.association_id = a.id) AS target_amount
      FROM associations a
      WHERE a.blocked = 0 AND a.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Association introuvable' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getPublicAssociationById:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= ADMIN DOWNLOAD ================= */

// 🔹 Download documents (depuis demandes_association)
export const downloadAssociationDocument = async (req, res) => {
  const { id, doc } = req.params;
  const allowedFields = ['doc_statut', 'doc_autorisation', 'doc_registre', 'doc_cin', 'logo'];

  if (!allowedFields.includes(doc)) {
    return res.status(400).json({ message: 'Champ invalide' });
  }

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const [rows] = await db.execute(`SELECT ${doc} FROM demandes_association WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ message: 'Association introuvable' });

    const filename = rows[0][doc];
    if (!filename) return res.status(404).json({ message: 'Fichier introuvable' });

    const filePath = path.join('./upload', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier introuvable' });

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= ASSOCIATION ================= */

// 🔹 Récupérer tous les bénéficiaires de l'association connectée
export const getMyBeneficiaires = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const assocId = req.user.id;

    const [beneficiaires] = await db.execute(
      `SELECT 
        id,
        nom,
        prenom,
        email,
        telephone,
        adresse,
        description,
        cin,
        date_naissance,
        genre,
        situation_familiale,
        montant_a_collecter,
        montant_restant,
        COALESCE(pourcentage, 0) AS pourcentage,
        created_at,
        updated_at
       FROM beneficiaires
       WHERE association_id = ?
       ORDER BY created_at DESC`,
      [assocId],
    );

    res.status(200).json(beneficiaires);
  } catch (err) {
    console.error('Erreur getMyBeneficiaires:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Modifier le pourcentage d’un bénéficiaire (association uniquement)
export const updatePourcentage = async (req, res) => {
  const { id } = req.params;
  let { pourcentage } = req.body;

  const association_id = req.user.id;

  try {
    if (req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    pourcentage = Number(pourcentage);

    if (isNaN(pourcentage)) return res.status(400).json({ message: 'Le pourcentage doit être un nombre' });
    if (pourcentage < 0 || pourcentage > 100) return res.status(400).json({ message: 'Le pourcentage doit être entre 0 et 100' });

    const [benef] = await db.execute(`SELECT id FROM beneficiaires WHERE id = ? AND association_id = ?`, [id, association_id]);
    if (benef.length === 0) return res.status(403).json({ message: 'Vous ne pouvez modifier que vos bénéficiaires' });

    await db.execute(`UPDATE beneficiaires SET pourcentage = ? WHERE id = ?`, [pourcentage, id]);

    res.status(200).json({ message: 'Pourcentage mis à jour avec succès', pourcentage });
  } catch (err) {
    console.error('Erreur updatePourcentage:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Donneurs de mon association
export const getMyDonneurs = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const associationId = req.user.id;

    const [beneficiaires] = await db.execute('SELECT id, nom, prenom FROM beneficiaires WHERE association_id = ?', [associationId]);
    if (!beneficiaires.length) return res.json([]);

    const beneficiaireIds = beneficiaires.map((b) => b.id);

    const [donneurs] = await db.execute(
      `SELECT DISTINCT 
          u.id AS donneur_id, 
          u.nom AS donneur_nom, 
          u.email AS donneur_email,
          d.montant, 
          d.created_at AS date_don,
          b.nom AS beneficiaire_nom, 
          b.prenom AS beneficiaire_prenom
       FROM utilisateurs u
       JOIN donations d ON d.donneur_id = u.id
       JOIN beneficiaires b ON b.id = d.beneficiaire_id
       WHERE u.role='donneur'
       AND d.beneficiaire_id IN (${beneficiaireIds.map(() => '?').join(',')})`,
      beneficiaireIds,
    );

    res.status(200).json(donneurs);
  } catch (err) {
    console.error('Erreur getMyDonneurs:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/* ================= MON COMPTE (ASSOCIATION) ================= */

// ✅ GET /associations/me : retourne les champs nécessaires (✅ +telephone +adresse)
export const getMyAssociationProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const assocId = req.user.id;

    const [rows] = await db.execute(
      `SELECT id, nom, email, telephone, adresse, description, logo, categorie
       FROM associations
       WHERE id = ?
       LIMIT 1`,
      [assocId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Association introuvable' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('Erreur getMyAssociationProfile:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ PUT /associations/me : modifier nom + description + categorie + telephone + adresse
export const updateMyAssociationProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const assocId = req.user.id;
    const { nom, description, categorie, telephone, adresse } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({ message: 'Le nom est obligatoire' });
    }

    await db.execute(
      `UPDATE associations
       SET nom = ?, description = ?, categorie = ?, telephone = ?, adresse = ?
       WHERE id = ?`,
      [nom.trim(), description ?? null, categorie ?? null, telephone ?? null, adresse ?? null, assocId],
    );

    return res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error('Erreur updateMyAssociationProfile:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ PUT /associations/me/logo : upload image et update DB.logo
export const updateMyAssociationLogo = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'association') {
      return res.status(403).json({ message: 'Accès refusé : Association uniquement' });
    }

    const assocId = req.user.id;

    if (!req.file?.filename) {
      return res.status(400).json({ message: 'Aucun fichier reçu (champ: logo)' });
    }

    const [rows] = await db.execute(`SELECT logo FROM associations WHERE id = ? LIMIT 1`, [assocId]);
    const oldLogo = rows?.[0]?.logo;

    await db.execute(`UPDATE associations SET logo = ? WHERE id = ?`, [req.file.filename, assocId]);

    if (oldLogo) {
      const oldPath = path.join(path.resolve(), 'upload', oldLogo);
      fs.unlink(oldPath, () => {});
    }

    return res.json({ message: 'Logo mis à jour', logo: req.file.filename });
  } catch (err) {
    console.error('Erreur updateMyAssociationLogo:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};