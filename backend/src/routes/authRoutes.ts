import { Router } from 'express';
import {
  getCurrentUser,
  loginWithEmail,
  getGoogleAuthUrl,
  handleGoogleCallback,
  handleGoogleDemoLogin,
} from '../controllers/authController.js';

const router = Router();

router.get('/me', getCurrentUser);
router.post('/login', loginWithEmail);
router.get('/google/url', getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);
router.get('/google/demo', handleGoogleDemoLogin);

export default router;
