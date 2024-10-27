const express = require('express');
const session = require('express-session');
const authController = require('../controllers/authController');
const router = express.Router();
const passport = require('passport');
const authMiddleware = require('../middlewares/auth');
// const auth= require('../middlewares/verifyUser');
const auth = require("../middlewares/isLogin");
require('../passport');
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const productModel= require('../models/productModel');
const { body, validationResult } = require('express-validator');
router.use(passport.initialize());
router.use(passport.session());
const { sendResetEmail } = require('../helpers/nodemailer');
const userController = require('../controllers/userController');
router.use(session({
    secret: process.env.SESSION_SECRET_KEY,
    resave:false,
    saveUninitialized:true
  }));
// router.use(authMiddleware);


router.get('/',auth.isLoggedOut,authController.getHome);
router.get('/login',auth.isLoggedIn,authController.getUserLogin);
router.post('/login',authController.doUserLogin);
// router.post('/',authController.doUserLogin);
router.get('/signup',authController.getUserSignup);
router.post('/signup',authController.checkUniqueEmail,authController.checkUniqueMobile,authController.doUserSignup);
//signup otp verification
router.get('/verifyotp',authController.loadotp);
router.post('/verifyotp',authController.verifyOtp);


router.get('/admin',authController.getAdminLogin);
router.post('/admin',authController.doAdminLogin);
router.get('/userLogout',authController.userLogout);
router.get('/adminLogout',authController.adminLogout);

//forgot password

router.get('/forgot-password',authController.getForgotPass);
router.post('/forgotPass',authController.postForgotPass);

router.get("/getOtpPage",authController.getOtpPage);
router.post("/getOtpPage",authController.doNewPasswordOtp);
router.post("/resendPassOTP",authController.resendOTP);
router.get('/newPass',authController.getNewPassword);
router.post('/newPass',authController.doNewPassword);
// router.post('/newPass',authController.doNewPassword);

router.get('/reset-password/:token',authController.getResetPass);
// router.post('/reset/:token',authController.resetPassword)
router.post('/resendOTP',authController.resendOtp);




router.get('/auth/google', passport.authenticate('google', { scope: 
	[  'profile','email' ] 
}));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/signUp' }),
  async (req, res) => {
      try {
          const user = req.user;

          if (user.is_active === true && user.is_admin === false) {
              const payload = { userId: user._id };
              const token = jwt.sign(payload, 'secretKey', { expiresIn: "24h" });

              res.cookie("UserToken", token, {
                  httpOnly: true,
                  secure: false,
                  sameSite: "strict",
              });

              req.session.isLoggedIn = true;
              req.session.user_id = user._id;
              res.redirect('/userHome');
          } else {
              console.log('User is inactive or is an admin, redirecting to login.');
              res.redirect("/login");
          }
      } catch (error) {
          console.error('Error during authentication callback:', error);
          res.status(500).redirect('/login'); 
      }
  }
);

  


  
  

module.exports = router;