import express from 'express';
import {
  getNotifications,
  loginBeneficiaire,
  markAsRead,
  getDonationsRecues,
  getBeneficiaireProfile,
  updateBeneficiaireProfile,
  updateBeneficiaireFiles,
} from '../controllers/beneficiaireController.js';
import { verifyBeneficiaireToken } from '../middleware/authBeneficiaire.js';

// ✅ tu dis que tu as créé ce fichier
import { uploadBeneficiaireFiles } from '../middleware/uploadbeneficiaurefile.js';

const router = express.Router();

router.post('/login', loginBeneficiaire);

router.get('/notifications', verifyBeneficiaireToken, getNotifications);
router.put('/notifications/:id/read', verifyBeneficiaireToken, markAsRead);

// ✅ Dons reçus
router.get('/donations', verifyBeneficiaireToken, getDonationsRecues);

// ✅ Mon compte
router.get('/me', verifyBeneficiaireToken, getBeneficiaireProfile);
router.put('/me', verifyBeneficiaireToken, updateBeneficiaireProfile);

// ✅ Upload fichiers (deux champs)
router.put(
  '/me/files',
  verifyBeneficiaireToken,
  uploadBeneficiaireFiles.fields([
    { name: 'doc_cin', maxCount: 1 },
    { name: 'doc_autre', maxCount: 1 },
  ]),
  updateBeneficiaireFiles,
);

export default router;