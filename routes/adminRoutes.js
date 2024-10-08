const express = require('express');
const router =express.Router();
const adminController = require('../controllers/adminController');
const bodyParser= require("body-parser");
router.use(bodyParser.json());
const path= require("path");

const multer = require("multer");
const userController = require('../controllers/userController');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './uploadedImages'); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
      const filename = Date.now() + '-' + file.originalname.replace(/\s+/g, '-'); // Replace spaces with dashes
      cb(null, filename);
  }
});

// Configure multer with storage and optional file filter
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
      const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
          return cb(null, true);
      }
      cb(new Error('Error: File type not supported!'));
  }
});
router.post('/dashboard-data',adminController.getDashboardData);
router.get('/adminHome',ensureLoggedIn,adminController.getHomePage);
router.get('/products',ensureLoggedIn,adminController.getAdminProducts);

router.get('/add-product',adminController.adminAdd_Products);

router.post('/add-product', upload.array('image', 10),adminController.postAddProduct);
router.get('/users',adminController.adminGetUsers);
router.get('/add-user',adminController.adminGetAddUser);
router.post('/add-user',adminController.adminAddUser);
// router.get('/edit-user/:id',adminController.getEditUser);
// router.post('/edit-user/:id',adminController.updateUser);
router.post('/delete-product/:id',adminController.adminDeleteProduct);
router.get('/edit-product/:id',adminController.getEditProduct);
router.post('/edit-product/:id',upload.array('image'),adminController.updateEditProduct);

router.get('/category',adminController.getCategory);

router.get('/add-category',adminController.getaddCategory);
router.post('/add-category',upload.single('cimage'),adminController.addCategory);
router.post('/delete-category/:id',adminController.deleteCategory);
router.get('/edit-category/:id',adminController.getEditCategory);
router.post('/edit-category/:id',upload.single('cimage'),adminController.updateCategory);
router.post('/delete-user/:id',adminController.deleteUser);
router.post('/search-product',adminController.searchProduct);
router.post('/search-user',adminController.searchUser);
router.get('/block/:id', adminController.blockUser)
router.get('/unblockUser/:id',adminController.unblockUser);

router.get('/orders',adminController.viewOrders);
router.get('/AdminOrderDetails/:id',adminController.getAdminOrderDetailpage);


router.get('/adminCoupon',adminController.getAdminCouponPage);
// router.get('/addCoupon',adminController.getAddCoupon);
router.post('/addCoupon',adminController.doAddCoupon);

router.get('/deleteCoupon/:id',adminController.deleteCoupon);
router.get('/editCoupon/:id',adminController.getEditCoupon);
router.post('/editCoupon/:id',adminController.postEditCoupon);
router.post("/add-offer/:id",adminController.addCatOffer);
router.post('/remove-offer/:id',adminController.removeCatOffer);
router.post('/add-product-offer/:id',adminController.addProductOffer);
router.post('/remove-product-offer/:id',adminController.removeProductOffer);
router.post("/change-order-status",adminController.changeOrderStatus);
router.post('/update-wallet',adminController.updateRefund);
router.get("/download/pdf",adminController.getDownloadPdf);
router.get("/download/excel",adminController.downloadExcel);
module.exports = router;


function ensureLoggedIn(req, res, next) {
   if (req.session.userId) {
     res.redirect('/dashboard'); // or wherever you want to redirect logged-in users
   } else {
     next();
   }
 }