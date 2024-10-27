const express = require('express');
const router= express.Router();
const session = require('express-session');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bodyParser= require("body-parser");
const auth = require('../middlewares/verifyUser');
require('dotenv').config();
const userModel= require("../models/userModel");
const authController= require('../controllers/authController')
const invoice = require("../controllers/invoice");
router.use(bodyParser.json());
router.use(session({
    secret: process.env.SESSION_SECRET_KEY,
    resave:false,
    saveUninitialized:true
  }));
// router.use(authMiddleware);

const path= require("path");
const orderModel = require('../models/orderModel');
const { Title } = require('chart.js');


router.get('/userHome',authMiddleware,userController.getHome);
router.get('/shop',authMiddleware,userController.getShop);
router.get('/user-account',authMiddleware,userController.getUserAccount);
router.get('/product/:id',authMiddleware,userController.getProductDetails);
router.post('/add-address',userController.doAddAddress);
router.post('/search',userController.searchProduct);
router.get('/cart',authMiddleware,userController.getCart);
router.post('/add-to-cart/:id',authMiddleware,userController.addToCart);
router.post('/remove-item/:id',authMiddleware,userController.removeFromCart);
router.get('/checkout',authMiddleware,userController.getCheckOutPage);
router.get('/account',authMiddleware,userController.getAccountPage);
router.post('/edit-profile/:id',authMiddleware,userController.updateEditProfile);
router.get('/addresses',authMiddleware,userController.getAddresses);
router.get('/edit-address/:id',authMiddleware,userController.editAddress);
router.post('/edit-address/:id',userController.doEditAddress);
router.post('/delete-address/:id',userController.deleteAddress);
router.get('/wishlist/add/:id',auth.isLogout,authMiddleware,userController.getWishlist);
router.post('/wishlist/add/:id',authMiddleware,userController.getWishlist);

router.get('/wishlist',authMiddleware,userController.getWishlistPage);
router.get('/filter',userController.getFilter);
router.get('/search',userController.searchSort);
// router.post('/update-quantity/:id', cartController.updateQuantity);
// router.post('/cart',userController.postCart)
//filterst
router.post('/redeem-referral-code',userController.redeemReferralCode);
router.get('/men',userController.getMenCategory);
router.get('/women',userController.getWomenCategory);
router.get('/unisex',userController.getUnisexCategory);
router.get('/my-orders',userController.myOrders);
router.get('/removeFromWishlist/:id',userController.removeFromWishlist);
router.post('/place-order',authMiddleware,userController.placeOrder);
router.post("/checkOut",userController.postCheckout);
router.get("/coupons",userController.getCouponPage);
router.post('/verify-payment', authMiddleware, userController.verifyPayment);
router.post('/my-orderDetailes/:id',userController.getOrderDetailPage);
// router.post('/createOrder', paymentController.createOrder);

router.get('/order-success',userController.getOrderSuccess);

router.get('/order-failed',userController.getOrderFailed);
router.post("/cancel-order/:id",userController.getCancelForPending);
router.post('/cancel-order',userController.userCancelOrder)
router.post("/return-product",userController.userReturnReq);
router.get('/my-wallet',userController.getMyWallet);
router.post('/add-money', userController.addMoney);

router.post('/payment-success', userController.paymentSuccess);
router.post('/apply-coupon',userController.postApplyCoupon);

router.post('/download-invoice',invoice.downloadInvoice);
router.post("/retry-order",userController.retryOrder);

router.get('/otp',userController.loadotp);
router.post('/postotp',userController.verifyOTP);
router.post('/profileResendOTP',userController.resendOTP);
//update password
router.post("/verify-email",userController.verifyEmail);
router.get("/newPassword",userController.newPassword);
router.post("/updatePassword",userController.updatePassword);
// router.get("*", (req, res) => {
//   res.status(404).render('user/404');
// });

router.use((err, req, res, next) => {
  console.error(err.stack); 
  res.status(500).render('user/500'); 
});








module.exports = router;