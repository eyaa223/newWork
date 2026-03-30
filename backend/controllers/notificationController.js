import db from '../config/db.js';

// 🔹 Récupérer toutes les notifications visibles pour l'utilisateur
export const getNotifications = async (req, res) => {
  try {
    let query = `
      SELECT 
        n.id, 
        n.demande_id,
        n.association_id,
        n.donneur_id,
        n.donation_id,
        n.type, 
        n.message, 
        n.is_read, 
        n.created_at,
        n.reference_type,
        n.demande_beneficiaire_id,
        b.nom AS beneficiaire_nom,
        b.prenom AS beneficiaire_prenom,
        b.montant_a_collecter,
        a.nom AS nom_association
      FROM notification n
      LEFT JOIN demandes_beneficiaire b ON n.demande_id = b.id
      LEFT JOIN associations a ON n.association_id = a.id
    `;

    const params = [];

    if (req.user.role === 'admin') {
      // admin voit tout
    } else if (req.user.role === 'avocat') {
      query += ` WHERE n.type IN ('demande_ajoute_avocat', 'statut_avocat', 'beneficiaire_modifie', 'beneficiaire_ajoute_avocat') `;
    } else if (req.user.role === 'association') {
      query += ` WHERE n.association_id = ? `;
      params.push(req.user.id);
    } else if (req.user.role === 'donneur') {
      query += ` WHERE n.donneur_id = ? `;
      params.push(req.user.id);
    } else {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    query += ` ORDER BY n.created_at DESC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[getNotifications] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Marquer notification comme lue
export const markAsRead = async (req, res) => {
  try {
    const id = req.params.id;

    if (req.user.role === 'admin') {
      await db.execute('UPDATE notification SET is_read = 1 WHERE id = ?', [id]);
      return res.json({ message: 'Notification marquée comme lue' });
    }

    if (req.user.role === 'association') {
      await db.execute(
        'UPDATE notification SET is_read = 1 WHERE id = ? AND association_id = ?',
        [id, req.user.id],
      );
      return res.json({ message: 'Notification marquée comme lue' });
    }

    if (req.user.role === 'donneur') {
      await db.execute(
        'UPDATE notification SET is_read = 1 WHERE id = ? AND donneur_id = ?',
        [id, req.user.id],
      );
      return res.json({ message: 'Notification marquée comme lue' });
    }

    if (req.user.role === 'avocat') {
      await db.execute(
        `UPDATE notification
         SET is_read = 1
         WHERE id = ?
           AND type IN ('demande_ajoute_avocat', 'statut_avocat', 'beneficiaire_modifie', 'beneficiaire_ajoute_avocat')`,
        [id],
      );
      return res.json({ message: 'Notification marquée comme lue' });
    }

    return res.status(403).json({ message: 'Accès refusé' });
  } catch (err) {
    console.error('[markAsRead] erreur', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};