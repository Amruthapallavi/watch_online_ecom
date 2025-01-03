const express = require('express');
const router =express.Router();
const adminController = require('../controllers/adminController');
const bodyParser= require("body-parser");
router.use(bodyParser.json());
const path= require("path");
const fs= require('fs');
const adminAuthMiddleware= require('../middlewares/adminAuth');
const multer = require("multer");
const authController= require("../controllers/authController");
const userController = require('../controllers/userController');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      // Ensure the directory exists, create if it doesn't
      const dir = './uploadedImages'; // Updated directory to match your existing code
      if (!fs.existsSync(dir)){
          fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
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
      const filetypes = /jpeg|jpg|png|gif/; 
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

      if (mimetype && extname) {
          return cb(null, true);
      }
      cb(new Error('Error: File type not supported!'));
  }
});

router.get('/admin',authController.getAdminLogin);

router.post('/dashboard-data',adminAuthMiddleware,adminController.getDashboardData);
router.get('/adminHome',adminAuthMiddleware,adminController.getHomePage);
router.get('/products',adminAuthMiddleware,adminController.getAdminProducts);

router.get('/add-product',adminAuthMiddleware,adminController.adminAdd_Products);

router.post('/add-product', upload.array('image', 10),adminController.postAddProduct);
router.get('/users',adminAuthMiddleware,adminController.adminGetUsers);
router.get('/add-user',adminAuthMiddleware,adminController.adminGetAddUser);
router.post('/add-user',adminAuthMiddleware,adminController.adminAddUser);
// router.get('/edit-user/:id',adminController.getEditUser);
// router.post('/edit-user/:id',adminController.updateUser);
router.post('/delete-product/:id',adminController.adminDeleteProduct);
router.get('/edit-product/:id',adminAuthMiddleware,adminController.getEditProduct);
router.post('/edit-product/:id',upload.array('image', 10),adminController.updateEditProduct);

router.get('/category',adminAuthMiddleware,adminController.getCategory);

router.get('/add-category',adminController.getaddCategory);
router.post('/add-category',upload.single('cimage'),adminController.addCategory);
router.post('/delete-category/:id',adminController.deleteCategory);
// router.get('/edit-category/:id',adminController.getEditCategory);
router.post('/edit-category/:id',adminController.updateCategory);
router.post('/delete-user/:id',adminController.deleteUser);
router.post('/search-product',adminController.searchProduct);
router.post('/search-user',adminController.searchUser);
router.get('/block/:id',adminAuthMiddleware, adminController.blockUser)
router.get('/unblockUser/:id',adminAuthMiddleware,adminController.unblockUser);

router.get('/orders',adminAuthMiddleware,adminController.viewOrders);
router.get('/AdminOrderDetails',adminController.getAdminOrderDetailpage);


router.get('/adminCoupon',adminAuthMiddleware,adminController.getAdminCouponPage);
// router.get('/addCoupon',adminController.getAddCoupon);
router.post('/addCoupon',adminController.doAddCoupon);

router.get('/deleteCoupon/:id',adminAuthMiddleware,adminController.deleteCoupon);
router.get('/editCoupon/:id',adminAuthMiddleware,adminController.getEditCoupon);
router.post('/editCoupon/:id',adminAuthMiddleware,adminController.postEditCoupon);
router.post("/add-offer/:id",adminController.addCatOffer);
router.post('/remove-offer/:id',adminController.removeCatOffer);
router.post('/add-product-offer/:id',adminController.addProductOffer);
router.post('/remove-product-offer/:id',adminController.removeProductOffer);
router.post("/change-product-status",adminController.changeOrderStatus);
// router.post('/update-wallet',adminController.updateRefund);
router.get("/download/pdf",adminAuthMiddleware,adminController.getDownloadPdf);
router.get("/download/excel",adminAuthMiddleware,adminController.downloadExcel);
router.get('/payment-methods-data',adminAuthMiddleware,adminController.paymentData);
router.get("/category-sales-data",adminAuthMiddleware,adminController.categoryData);












router.get('*', (req, res) => {
    res.status(404).render('user/404'); 
  });
  
  // router.use((err, req, res, next) => {
  //   console.error(err.stack); 
  //   res.status(500).render('admin/500'); 
  // });





module.exports = router;


