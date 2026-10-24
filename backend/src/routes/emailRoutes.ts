import { Router } from 'express';
import multer from 'multer';
import {
  scheduleEmail,
  getEmails,
  getEmailById,
  cancelScheduledEmail,
  parseCsvLeads,
  getStats,
  getSenders,
} from '../controllers/emailController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.post('/schedule', scheduleEmail);
router.post('/parse-leads', upload.single('file'), parseCsvLeads);
router.get('/', getEmails);
router.get('/stats', getStats);
router.get('/senders', getSenders);
router.get('/:id', getEmailById);
router.delete('/:id', cancelScheduledEmail);

export default router;
