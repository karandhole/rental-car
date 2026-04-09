import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/coupon.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', getCoupons);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
