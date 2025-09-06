import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { 
    registerUser,
    loginUser,
    authMe
} from "../controllers/user.controller.js";

const router=Router();

router.route('/register').post(upload.single("avatar"),registerUser);
router.route('/login').post(loginUser);
//Secured Routes
router.route('/auth/me').get(authenticate,authMe);

export default router;