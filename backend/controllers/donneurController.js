import db from '../config/db.js';

// 🔹 Liste toutes les associations (donneur uniquement)
export const listAssociations = async (req, res) => {
  if (req.user.role !== 'donneur')
    return res.status(403).json({ message: 'Accès refusé' });

  try {
    const [associations] = await db.execute(`SELECT * FROM associations WHERE blocked = 0`);
    res.json(associations);
  } catch (err) {
    console.error('[listAssociations] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Voir tous les bénéficiaires d'une association (donneur uniquement)
export const listBeneficiaires = async (req, res) => {
  if (req.user.role !== 'donneur')
    return res.status(403).json({ message: 'Accès refusé' });

  const assocId = req.params.id;

  try {
    const [beneficiaires] = await db.execute(
      `SELECT * FROM beneficiaires WHERE association_id = ?`,
      [assocId]
    );
    res.json(beneficiaires);
  } catch (err) {
    console.error('[listBeneficiaires] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ CRÉER UN DON + NOTIFS
export const createDonation = async (req, res) => {
  const { beneficiaire_id, montant, numero_bancaire, message } = req.body;
  const donneur_id = req.user.id;

  if (!beneficiaire_id || !montant || !numero_bancaire) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  const cleanMessage =
    typeof message === 'string' && message.trim() ? message.trim().slice(0, 500) : null;

  try {
    const [benef] = await db.execute(
      `SELECT nom, prenom, montant_restant FROM beneficiaires WHERE id = ?`,
      [beneficiaire_id]
    );
    if (benef.length === 0)
      return res.status(404).json({ message: 'Bénéficiaire introuvable' });

    if (Number(benef[0].montant_restant) <= 0)
      return res.status(400).json({ message: 'Montant déjà collecté' });

    const montantDonEffectif = Math.min(Number(montant), Number(benef[0].montant_restant));

    // ✅ INSERT (sans updated_at)
    const [donationResult] = await db.execute(
      `INSERT INTO donations (donneur_id, beneficiaire_id, montant, numero_bancaire, message)
       VALUES (?, ?, ?, ?, ?)`,
      [donneur_id, beneficiaire_id, montantDonEffectif, numero_bancaire, cleanMessage]
    );
    const donationId = donationResult?.insertId;

    const nouveauMontantRestant = Number(benef[0].montant_restant) - montantDonEffectif;
    await db.execute(
      `UPDATE beneficiaires SET montant_restant = ? WHERE id = ?`,
      [nouveauMontantRestant, beneficiaire_id]
    );

    // Notifications
    const notifDonMessage = `Vous avez reçu un don de ${montantDonEffectif} DT ! Montant restant : ${nouveauMontantRestant} DT.`;
    await db.execute(
      `INSERT INTO notification_beneficiaire (beneficiaire_id, type, message, is_read, created_at)
       VALUES (?, 'nouveau_don', ?, 0, NOW())`,
      [beneficiaire_id, notifDonMessage]
    );

    if (cleanMessage) {
      await db.execute(
        `INSERT INTO notification_beneficiaire (beneficiaire_id, type, message, is_read, created_at)
         VALUES (?, 'message_donneur', ?, 0, NOW())`,
        [beneficiaire_id, cleanMessage]
      );
    }

    const donorNotifMessage = `Merci pour votre don de ${montantDonEffectif} DT. Don validé.`;
    await db.execute(
      `INSERT INTO notification (donneur_id, donation_id, type, message, is_read, created_at, reference_type, demande_id, demande_beneficiaire_id, association_id)
       VALUES (?, ?, ?, ?, 0, NOW(), 'donation', NULL, NULL, NULL)`,
      [donneur_id, donationId || null, 'don_valide', donorNotifMessage]
    );

    return res.status(201).json({
      message: 'Don créé avec succès',
      donation_id: donationId,
      montant_restant: nouveauMontantRestant,
    });
  } catch (err) {
    console.error('[createDonation] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Liste mes dons
export const listMesDons = async (req, res) => {
  const donneur_id = req.user.id;
  try {
    const [rows] = await db.execute(
      `SELECT d.*, b.nom AS beneficiaire_nom, b.prenom AS beneficiaire_prenom, b.montant_restant
       FROM donations d
       JOIN beneficiaires b ON d.beneficiaire_id = b.id
       WHERE d.donneur_id = ?
       ORDER BY d.created_at DESC`,
      [donneur_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[listMesDons] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Profil du donneur
export const getMyDonneurProfile = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const donneur_id = req.user.id;
  
  try {
    const [uRows] = await db.execute(
      `SELECT id, nom, email, numero_bancaire FROM utilisateurs WHERE id = ? LIMIT 1`,
      [donneur_id]
    );
    if (uRows.length === 0)
      return res.status(404).json({ message: 'Utilisateur introuvable' });

    let numero_bancaire = uRows[0].numero_bancaire || '';
    
    if (!numero_bancaire) {
      const [dRows] = await db.execute(
        `SELECT numero_bancaire FROM donations WHERE donneur_id = ? AND numero_bancaire IS NOT NULL AND numero_bancaire <> '' ORDER BY created_at DESC LIMIT 1`,
        [donneur_id]
      );
      numero_bancaire = dRows?.[0]?.numero_bancaire || '';
    }

    return res.json({ 
      id: uRows[0].id, 
      nom: uRows[0].nom, 
      email: uRows[0].email, 
      numero_bancaire 
    });
  } catch (err) {
    console.error('[getMyDonneurProfile] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Mise à jour profil (nom/email) - SANS updated_at
export const updateMyDonneurProfile = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  const donneur_id = req.user.id;
  const { nom, email } = req.body;
  
  if (!nom || !nom.trim() || !email || !email.trim()) {
    return res.status(400).json({ message: 'Nom et email sont requis' });
  }
  
  try {
    const [exists] = await db.execute(
      `SELECT id FROM utilisateurs WHERE email = ? AND id <> ? LIMIT 1`,
      [email.trim(), donneur_id]
    );
    if (exists.length > 0)
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    // ✅ UPDATE sans updated_at
    await db.execute(
      `UPDATE utilisateurs SET nom = ?, email = ? WHERE id = ?`,
      [nom.trim(), email.trim(), donneur_id]
    );
    return res.json({ message: 'Profil mis à jour' });
  } catch (err) {
    console.error('[updateMyDonneurProfile] erreur:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Mise à jour numéro bancaire - SANS updated_at
export const updateMyDonneurBankNumber = async (req, res) => {
  if (req.user?.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  const donneur_id = req.user.id;
  const { numero_bancaire } = req.body;

  if (!numero_bancaire || typeof numero_bancaire !== 'string' || !numero_bancaire.trim()) {
    return res.status(400).json({ message: 'Numéro bancaire requis' });
  }

  const cleanedNumber = numero_bancaire.trim();

  try {
    // ✅ UPDATE utilisateurs (sans updated_at)
    const [userResult] = await db.execute(
      `UPDATE utilisateurs SET numero_bancaire = ? WHERE id = ?`,
      [cleanedNumber, donneur_id]
    );

    if (userResult.affectedRows === 0) {
      return res.json({ 
        message: 'Numéro bancaire déjà à jour', 
        numero_bancaire: '••••' + cleanedNumber.slice(-4) 
      });
    }

    // ✅ (Optionnel) Mettre à jour les dons existants
    await db.execute(
      `UPDATE donations SET numero_bancaire = ? WHERE donneur_id = ?`,
      [cleanedNumber, donneur_id]
    );

    return res.json({ 
      message: 'Numéro bancaire mis à jour avec succès',
      numero_bancaire: '••••' + cleanedNumber.slice(-4)
    });

  } catch (err) {
    console.error('[updateMyDonneurBankNumber] erreur:', {
      message: err.message,
      code: err.code
    });
    
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ 
        message: 'Erreur de configuration BDD',
        hint: process.env.NODE_ENV === 'development' 
          ? 'Colonne "numero_bancaire" introuvable dans la table' 
          : undefined
      });
    }
    
    return res.status(500).json({ 
      message: 'Erreur serveur',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ============================================================================
// ✅ Gestion des messages / commentaires
// ============================================================================

export const getMyMessages = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donneurId = req.user.id;
    const [rows] = await db.execute(
      `SELECT d.id, d.montant, d.message, d.created_at, b.nom as beneficiaire_nom, b.prenom as beneficiaire_prenom
       FROM donations d
       INNER JOIN beneficiaires b ON d.beneficiaire_id = b.id
       WHERE d.donneur_id = ? AND d.message IS NOT NULL AND d.message != ''
       ORDER BY d.created_at DESC`,
      [donneurId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[getMyMessages] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateDonationMessage = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donationId = req.params.id;
    const { message } = req.body;
    const donneurId = req.user.id;

    const [rows] = await db.execute(
      'SELECT id FROM donations WHERE id = ? AND donneur_id = ?',
      [donationId, donneurId]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await db.execute(
      'UPDATE donations SET message = ? WHERE id = ?',
      [message?.trim() || null, donationId]
    );
    
    res.json({ message: 'Message mis à jour avec succès', donationId });
  } catch (err) {
    console.error('[updateDonationMessage] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const deleteDonationMessage = async (req, res) => {
  if (req.user.role !== 'donneur') {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  try {
    const donationId = req.params.id;
    const donneurId = req.user.id;

    const [rows] = await db.execute(
      'SELECT id FROM donations WHERE id = ? AND donneur_id = ?',
      [donationId, donneurId]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await db.execute(
      'UPDATE donations SET message = NULL WHERE id = ?',
      [donationId]
    );
    
    res.json({ message: 'Message supprimé avec succès', donationId });
  } catch (err) {
    console.error('[deleteDonationMessage] erreur:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};