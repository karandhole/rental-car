import { getAdmin, updateAdmin } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import express from 'express'



const router = express.Router();


router.use(authMiddleware);


router.get('/',getAdmin);
router.patch('/', updateAdmin);



export default router;