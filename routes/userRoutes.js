const express = require('express');
const router= express.Router();
const session = require('express-session');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/auth');
const bodyParser= require("body-parser");
const auth = require('../middlewares/verifyUser');
require('dotenv').config();
const userModel= require("../models/userModel");
const cartController = require('../controllers/cartController');
const paymentController = require('../controllers/paymentController');
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
router.get('/wishlist',authMiddleware,userController.getWishlistPage);
router.get('/filter',userController.getFilter);
// router.post('/update-quantity/:id', cartController.updateQuantity);
// router.post('/cart',userController.postCart)
//filters

router.get('/men',userController.getMenCategory);
router.get('/women',userController.getWomenCategory);
router.get('/unisex',userController.getUnisexCategory);
router.get('/low-to-high',userController.lowToHigh);
router.get('/my-orders',userController.myOrders);
router.get('/removeFromWishlist/:id',userController.removeFromWishlist);
router.post('/place-order',authMiddleware,userController.placeOrder);

router.get("/coupons",userController.getCouponPage);
// Route for verifying the Razorpay payment
router.post('/verify-payment', authMiddleware, userController.verifyPayment);
router.post('/my-orderDetailes/:id',userController.getOrderDetailPage);
// router.post('/createOrder', paymentController.createOrder);

router.get('/order-success',userController.getOrderSuccess);

router.get('/order-failed',userController.getOrderFailed);
router.post('/cancel-order',userController.userCancelOrder)
router.post("/return-order",userController.userReturnReq);
router.get('/my-wallet',userController.getMyWallet);
router.post('/add-money', userController.addMoney);

router.post('/payment-success', userController.paymentSuccess);
router.post('/apply-coupon',userController.postApplyCoupon);

router.post('/download-invoice',invoice.downloadInvoice);
router.post("/retry-order",userController.retryOrder);



router.get("/adminSample",async (req,res)=>{
  try {
    const overall = await orderModel.aggregate([
      {
          $match: {
              orderStatus: { $nin: ['cancelled', 'payment pending'] } // Exclude both cancelled and payment pending orders
          }
      },
      {
          $group: {
              _id: null, // No grouping by specific field, aggregate all matching documents
              totalGrandTotal: { $sum: { $toDouble: "$grandTotal" } }, // Sum of grandTotal
              totalOfferDiscount: { $sum: { $toDouble: "$couponDiscount" } }, // Sum of offerDiscount
              totalAppliedOffers: {
                  $sum: {
                      $reduce: {
                          input: "$productsDetails.appliedOffer", // Access appliedOffer inside productsDetails array
                          initialValue: 0,
                          in: { $add: ["$$value", { $toDouble: "$$this" }] } // Sum of appliedOffer in productsDetails
                      }
                  }
              },
              totalOrders: { $sum: 1 } // Total count of orders
          }
      }
  ]);

  // Active users count
  const activeUsers = await userModel.countDocuments({ is_active: true });

  // Fetch top selling products and categories
  // const topProducts = await getTopSellingProducts();
  // const topCategories = await getTopSellingCategories();

  // Log overall results
  console.log(overall[0]?.totalGrandTotal); // Added optional chaining for safety

  // Render the admin dashboard with all data
  res.render('include/index', {
      title: 'admin_home',
      data: overall[0], // Accessing the first element since we are using $group
      activeUsers,
      // topProducts,
      // topCategories
  });
    
  } catch (error) {
    console.log(error.message);
  }
})



router.post('/update-order-status', async (req, res) => {
  try {
      const { order_id, status } = req.body;

      // Find the order by ID and update its status
      const updatedOrder = await orderModel.collection.updateOne(
          { "paymentDetails.orderId": order_id },
          { $set: { orderStatus: status } }
      );

      if (updatedOrder.modifiedCount === 0) {
          return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      return res.json({ success: true, message: 'Order status updated successfully.' });
  } catch (error) {
      console.error(error.message);
      return res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// Route to download the invoice
router.post('/download-invoice', async (req, res) => {
  try {
      const { orderId } = req.body; // Ensure this gets the orderId from the request body

      // Check if orderId is provided
      if (!orderId) {
          return res.status(400).json({ message: 'Order ID is required' });
      }

      // Find the order in the database
      const order = await Order.findById(orderId).populate('user'); // Assuming order has a user relationship
      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      // Continue with invoice generation...
  } catch (error) {
      console.error('Error generating invoice:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
});
























router.post('/checkout', (req, res) => {
  // const totals = req.body; // Get the request body containing the totals
  // const totalValues = {};
  // let grandTotal = 0;
  

console.log('reqsss',req.body);
  // Iterate through the object keys to get the total values
  // for (const key in totals) {
  //     if (key.startsWith('total-')) { // Check for keys that start with "total-"
  //         totalValues[key] = parseFloat(totals[key]); // Convert to number
  //         grandTotal += totalValues[key]; // Sum up for grand total
  //     }
  // }

  // const flatRate = parseFloat(totals.flatRate || 0); // Optional: Handle flat rate if included
  // grandTotal += flatRate; // Add flat rate if necessary

  // // Log the results for debugging
  // console.log('Total Values:', totalValues);
  // console.log('Grand Total:', grandTotal);

  // // Proceed with your checkout logic (e.g., saving order, redirecting, etc.)
  // // req.session.data = totals;
  req.session.cartData=req.body;
  req.session.grandTotal=req.body.subtotal;
  res.redirect('/checkout');
});


// router.post('/update-cart-item', async (req, res) => {
//   try {
//       const { cartItemId, quantity } = req.body;

//       // Find the cart item
//       const cart = await Cart.findOne({ userId: req.user.id }); // Adjust based on how you manage user sessions
//       const cartItem = cart.items.id(cartItemId);

//       if (!cartItem) {
//           return res.status(404).json({ message: 'Cart item not found' });
//       }

//       // Update the quantity
//       cartItem.quantity = quantity;

//       // Recalculate total
//       const product = await Product.findById(cartItem.productId);
//       cartItem.total = product.price * quantity;

//       // Save the updated cart
//       await cart.save();

//       // Recalculate the cart totals
//       const subtotal = cart.items.reduce((acc, item) => acc + item.total, 0);
//       const flatRate = 30; // Example flat rate
//       const grandTotal = subtotal + flatRate;

//       res.json({
//           subtotal,
//           grandTotal
//       });

//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Server error' });
//   }
// });








module.exports = router;