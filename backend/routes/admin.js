import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  login,
  getAssociations,
  blockAssociation,
  getDonneurs,
  getBeneficiaires,
  createAvocat,
} from '../controllers/adminController.js';

const router = express.Router();

/* 🔹 LOGIN (public) */
router.post('/login', login);

/* 🔹 Protected Routes */
router.use(verifyToken);

/* 🔹 Vérification role admin */
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé' });
  }
  next();
});

router.get('/associations', getAssociations);
router.put('/block/:id', blockAssociation);

/**
 * ✅ Donneurs + montant_total (SUM donations.montant par donneur)
 * IMPORTANT: getDonneurs doit retourner "montant_total"
 */
router.get('/donneurs', getDonneurs);

router.get('/beneficiaires', getBeneficiaires);

router.post('/create-avocat', createAvocat);

export default router;