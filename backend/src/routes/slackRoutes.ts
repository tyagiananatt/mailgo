import { Router } from 'express';
import {
  getSlackStatus,
  connectSlackWebhook,
  testSlack,
  disconnectSlack,
  getSlackOAuthUrl,
  handleSlackOAuthCallback,
} from '../controllers/slackController.js';

const router = Router();

router.get('/status', getSlackStatus);
router.post('/connect', connectSlackWebhook);
router.post('/test', testSlack);
router.post('/disconnect', disconnectSlack);
router.get('/oauth-url', getSlackOAuthUrl);
router.get('/callback', handleSlackOAuthCallback);

export default router;
