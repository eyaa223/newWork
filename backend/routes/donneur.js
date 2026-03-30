import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  listAssociations,
  listBeneficiaires,
  createDonation,
  listMesDons,
  getMyDonneurProfile,
  updateMyDonneurProfile,
  updateMyDonneurBankNumber,
  // ✅ NOUVEAUX IMPORTS
  getMyMessages,
  updateDonationMessage,
  deleteDonationMessage,
} from '../controllers/donneurController.js';

const router = express.Router();

// Routes existantes
router.get('/associations', verifyToken, listAssociations);
router.get('/associations/:id/beneficiaires', verifyToken, listBeneficiaires);
router.post('/donations', verifyToken, createDonation);
router.get('/mine', verifyToken, listMesDons);

// Mon compte (donneur)
router.get('/me', verifyToken, getMyDonneurProfile);
router.put('/me', verifyToken, updateMyDonneurProfile);
router.put('/me/bank', verifyToken, updateMyDonneurBankNumber);

// ✅ NOUVELLES ROUTES : Messages / Commentaires
router.get('/mes-messages', verifyToken, getMyMessages);
router.put('/donations/:id/message', verifyToken, updateDonationMessage);
router.delete('/donations/:id/message', verifyToken, deleteDonationMessage);

export default router;