import express from 'express';
import { createContactMessage, getAllContactMessages, deleteContactMessage } from '../controllers/contact.controller.js';

const router = express.Router();

router.post('/', createContactMessage);
router.get('/', getAllContactMessages);
router.delete('/:id', deleteContactMessage);

export default router;
