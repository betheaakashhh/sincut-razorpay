// routes/walletRoutes.js
import express from 'express';
import { 
  getWallet, 
  convertCoinsToDivine, 
  useDivineCoin 
} from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getWallet);
router.post('/convert-to-divine', protect, convertCoinsToDivine);
router.post('/use-divine-coin', protect, useDivineCoin);

export default router;