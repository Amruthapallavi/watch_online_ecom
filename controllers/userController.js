const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");
const productModel = require("../models/productModel");
const addressModel = require('../models/addressModel');
const categoryModel = require('../models/categoryModel');
const cartModel = require('../models/cartModel');
const wishlistModel= require('../models/wishlistModel');
const bodyParser= require('body-parser');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const {ObjectId} = require('mongodb');
const walletModel = require('../models/walletModel');
require('dotenv').config()
const moment = require("moment");

const formatDate = (date) => {
    if (!date) return '';
    return moment(date).format('MMMM Do YYYY'); 
};
const tokenVerification = require('../helpers/token');
const orderModel = require("../models/orderModel");
const { title } = require("process");
const couponModel = require("../models/couponModel");
const razorpay = new Razorpay({
  key_id:process.env.RAZORPAY_ID_KEY, 
  key_secret: process.env.RAZORPAY_SECRET_KEY,  
});

function generateOrderId() {
  const prefix = 'order_';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  
  // Generate a random string of 14 characters
  for (let i = 0; i < 14; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return prefix + randomString;
}






module.exports ={

    getHome :async (req,res)=>{

        try {
         const data= await productModel.find().limit(4);
        //  const user = await userModel.find({_id:req.session.userId});
        const token  = req.cookies.UserToken;
        // console.log(token);
        const result = jwt.verify(token,'secretKey');
        // console.log(result.userData);
         res.render('user/userHome',{
             title:'userHome',
             data:data,
         });
       
        } catch (error) {
         console.log(error.message);
         res.status(500).redirect('/500');
        }
     
     },
    

// getProducts: async (req,res)=>{
//     res.render('user/products',{
//         title:'Products'
//     })
// },

getProductDetails: async (req, res) => {
  try {
      const productId = req.params.id;
      const product = await productModel.findById(productId).populate('category');
      const catId = new ObjectId(product.category);
      const category = await categoryModel.findOne({ _id: catId });

      if (!product) {
          return res.status(404).send("Product not found");
      }

      // Calculate offerPrice for the main product
      let offerPrice = product.price; // Default to original price
      if (product.productOffer > 0) {
          offerPrice = product.price - (product.price * product.productOffer / 100);
      } else if (category && category.categoryOffer > 0) {
          offerPrice = product.price - (product.price * category.categoryOffer / 100);
      }

      // Fetch related products
      let relatedData = await productModel.find({ _id: { $ne: productId } }).limit(4).populate('category');

      // Calculate offerPrice for each related product
      relatedData = relatedData.map(relatedProduct => {
          let relatedOfferPrice = relatedProduct.price; // Default to original price
          if (relatedProduct.productOffer > 0) {
              relatedOfferPrice = relatedProduct.price - (relatedProduct.price * relatedProduct.productOffer / 100);
          } else if (relatedProduct.category && relatedProduct.category.categoryOffer > 0) {
              relatedOfferPrice = relatedProduct.price - (relatedProduct.price * relatedProduct.category.categoryOffer / 100);
          }
          return {
              ...relatedProduct._doc,
              offerPrice: relatedOfferPrice // Attach the calculated offer price
          };
      });

      // Render the product details page with related products including offerPrice
      res.render('user/productDetails', {
          title: product.pname,
          product,
          offerPrice, // Main product offer price
          relatedData, // Related products with offerPrice
          error: "",
          category
      });
  } catch (error) {
      console.log(error.message);
      res.status(500).redirect('/500');
      }
},

getShop: async (req, res) => {

  const token= req.cookies.UserToken;
  const userData= tokenVerification(token);
  const userId = new ObjectId(userData._id);
  const perPage = 4; // Number of products per page
  const page = parseInt(req.query.page) || 1; // Get the page number from query params
  const sortOption = req.query.sort || ''; // Get sort option from query params

  try {
      // Determine sorting criteria
      let sortCriteria = {};
      if (sortOption === 'low_to_high') {
          sortCriteria = { price: 1 };  // Sort by price ascending
      } else if (sortOption === 'high_to_low') {
          sortCriteria = { price: -1 }; // Sort by price descending
      }

      // Fetch products with pagination, sorting, and populate the category
      const products = await productModel.find()
          .populate('category')
          .sort(sortCriteria)  // Apply sorting here
          .skip((perPage * page) - perPage)
          .limit(perPage);

      // Fetch all categories with offers greater than 0
      const categories = await categoryModel.find({ categoryOffer: { $ne: '0' } });

      // Create a map of categories for easier access
      const categoryMap = {};
      categories.forEach(category => {
          categoryMap[category._id] = category.categoryOffer;
      });

      // Calculate offerPrice for each product
      const productsWithOfferPrice = products.map(product => {
          let offerPrice = product.price; // Default to original price

          // Check for productOffer
          if (product.productOffer) {
              offerPrice = product.price - (product.price * product.productOffer / 100);
          } 
          // Check for categoryOffer
          else if (product.category && categoryMap[product.category._id]) {
              const categoryOffer = categoryMap[product.category._id];
              offerPrice = product.price - (product.price * categoryOffer / 100);
          }

          return {
              ...product.toObject(), // Convert to plain object
              offerPrice: offerPrice.toFixed(2) // Format offerPrice to 2 decimal places
          };
      });

      console.log("Products with offer prices:", productsWithOfferPrice);

      // Count total number of products
      const count = await productModel.countDocuments();
      
      const wishlistItems  = await wishlistModel.find({ userId: userId })
      const wishlistProductIds = wishlistItems.map(item => item.productId.toString());


      // Check for any messages to show
      const showWishlistMessage = req.session.message; // Assuming you set this elsewhere
      req.session.message = null; // Clear the message after use

      // Render the products page
      res.render('user/products', {
          data: productsWithOfferPrice, // Use the modified products array
          wishlistMessage: showWishlistMessage || null, // Pass message if exists
          cartMessage: req.session.cartMessage || null, // Assuming you set this elsewhere
          title: 'Shop',
          categoryMap,
          wishlistProductIds: wishlistProductIds,
          currentPage: page,
          totalPages: Math.ceil(count / perPage),
          sortOption, // Pass the selected sort option to the view
      });
  } catch (error) {
      console.log("Error fetching products:", error.message);
      res.status(500).send("Internal Server Error"); // Send an error response
  }
},


getUserAccount : async (req,res)=>{
          try {
            const token= req.cookies.UserToken;

                const userData= tokenVerification(token);
                const user = await userModel.findOne({_id:new ObjectId(userData._id)})
                const address = await addressModel.collection.findOne({userId:new ObjectId(userData._id)})
                // console.log(address);
                res.render('user/userProfile',{
                    data: user,
                    address:address,
                    title:'my_account',
                   
                });
            
            
          }catch (error) {
            console.log(error.message);
            res.status(500).redirect('/500');
          }
},


doAddAddress: async (req, res ) => {
    try {
      const token= req.cookies.UserToken;

      const userData= tokenVerification(token);
      // console.log('inside address page');
      // console.log(req.body);
      const { userId, name, phone, house_no, street, locality, city, pincode, district, state } = req.body;

      const newAddress = await  addressModel.collection.insertOne({
          userId:new ObjectId(userData._id),
          name,
          phone,
          house_no,
          street,
          locality,
          city,
          pincode,
          district,
          state
      });

      // console.log(req.body);
        
      res.redirect(`/addresses`);
      console.log('success');
    } catch (error) {
      res.status(500).redirect('/500');    }
  },
  getCart: async (req, res) => {
    try {
        const token = req.cookies.UserToken;
        const userData = tokenVerification(token);
        const userId = new ObjectId(userData._id);

        const cartData = await cartModel.aggregate([
            { $match: { userId: userId } },
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'cartProducts'
                }
            },
            { $unwind: '$cartProducts' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'cartProducts.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    offerPrice: {
                        $cond: [
                            { $gt: ['$cartProducts.productOffer', 0] },
                            {
                                $subtract: [
                                    { $toDouble: '$cartProducts.price' }, // Convert price to numeric
                                    {
                                        $multiply: [
                                            { $toDouble: '$cartProducts.price' }, // Convert price to numeric
                                            { $divide: [{ $toDouble: '$cartProducts.productOffer' }, 100] } // Convert offer to numeric
                                        ]
                                    }
                                ]
                            },
                            {
                                $cond: [
                                    { $gt: ['$categoryInfo.categoryOffer', 0] },
                                    {
                                        $subtract: [
                                            { $toDouble: '$cartProducts.price' }, // Convert price to numeric
                                            {
                                                $multiply: [
                                                    { $toDouble: '$cartProducts.price' }, // Convert price to numeric
                                                    { $divide: [{ $toDouble: '$categoryInfo.categoryOffer' }, 100] } // Convert offer to numeric
                                                ]
                                            }
                                        ]
                                    },
                                    { $toDouble: '$cartProducts.price' } // Convert price to numeric
                                ]
                            }
                        ]
                    },
                    stock: '$cartProducts.quantity' // Fetch the stock from the product model
                }
            }
        ]);

        // Check for stock availability and adjust quantities if necessary
        cartData.forEach(item => {
            if (item.stock < item.products.quantity) {
                item.products.quantity = item.stock; // Set quantity to available stock
            }

            // If stock is less than 5, automatically set the cart quantity to the available stock
            if (item.stock < 5) {
                item.products.quantity = item.stock;
            }
        });

        // Calculate grand total
        const grandTotal = cartData.reduce((acc, curr) => acc + (curr.products.quantity * curr.offerPrice), 0);

        req.session.cart = cartData;

        let discountAmount = 0; // Update discount logic as needed
        res.render('user/cart', {
            products: cartData,
            subtotal: grandTotal,
            flat_rate: 30.00,
            discountAmount,
            grandTotal: grandTotal + 30.00 // Include flat rate in grand total
        });
    } catch (error) {
        console.log("Error fetching cart:", error.message);
        res.status(500).send("Server error");
    }
},




addToCart: async (req, res) => {
  try {
      const productId = new ObjectId(req.params.id);
      const token = req.cookies.UserToken;
      const userData = tokenVerification(token);

      const product = await productModel.findById(productId).populate('category');
      if (!product) {
          return res.status(404).json({ success: false, message: "Product not found" });
      }

      const catId = new ObjectId(product.category);
      const category = await categoryModel.findOne({ _id: catId });

      // Calculate offerPrice based on existing offers
      let offerPrice = product.price; // Default to original price
      if (product.productOffer > 0) {
          offerPrice = product.price - (product.price * product.productOffer / 100);
      } else if (category && category.categoryOffer > 0) {
          offerPrice = product.price - (product.price * category.categoryOffer / 100);
      }

      // Maximum quantity allowed
      const maxQuantity = 5;

      // Check if cart already exists for the user
      const existsCart = await cartModel.findOne({ userId: userData._id });

      if (existsCart) {
          const pexists = existsCart.products.find(data => data.productId.equals(productId));
          if (pexists) {
              // Check current quantity
              if (pexists.quantity >= maxQuantity) {
                  return res.status(400).json({ success: false, message: "Maximum quantity already added to cart." });
              }
              
              // Increment the quantity if under max limit
              const index = existsCart.products.findIndex(data => data.productId.equals(productId));
              existsCart.products[index].quantity++;
              existsCart.products[index].price = offerPrice; // Update with the offerPrice
              await existsCart.save();
          } else {
              // Add new product with quantity of 1
              existsCart.products.push({
                  productId: productId,
                  quantity: 1,
                  price: offerPrice // Include price when adding new product
              });
              await existsCart.save();
          }
      } else {
          // Create a new cart if it doesn't exist
          await cartModel.collection.insertOne({
              userId: new ObjectId(userData._id),
              products: [{
                  productId: productId,
                  quantity: 1,
                  price: offerPrice // Include price when adding new product
              }]
          });
      }

      // Remove the product from the wishlist (if needed)
      await wishlistModel.updateOne(
          { userId: userData._id }, // Match the user's wishlist
          { $pull: { products: { productId: productId } } } // Remove the product by ID
      );

      // Respond with success
      res.json({ success: true, message: "Item added to cart" });
  } catch (error) {
      console.log("Error adding to cart:", error.message);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
},


editAddress : async (req,res)=>{
  try {
    const token = req.cookies.UserToken;
      const userData = tokenVerification(token);
      const userId= new ObjectId(userData._id);
    // const token= req.cookies.UserToken;

    //             const userData= tokenVerification(token);
                const addressId=new ObjectId(req.params.id);
                // console.log(User);
                // console.log(userData._id);
                const address = await addressModel.collection.findOne({_id:addressId,userId:userId})
                res.render('user/edit-address',{
                  address:address,
                })
  } catch (error) {
    console.log(error.message);
    res.status(500).redirect('/500');
    }
},

doEditAddress: async (req, res, next) => {
  try {
    // const userid = req.query.id;
    
    const id = req.params.id;
    
    const {
      name,
      house_no,
      state,
      district,
      city,
      locality,
      pincode,
      street,
      phone,
    } = req.body;
  
    const updateFields = {
      name: name !== "" ? name : undefined,     
       house_no: house_no !== "" ? house_no : undefined,
       street: street !== "" ? street : undefined,
      state: state !== "" ? state : undefined,
      district: district !== "" ? district : undefined,
      city: city !== "" ? city : undefined,
      locality: locality !== "" ? locality : undefined,
      pincode: pincode !== "" ? pincode : undefined,
      phone: phone !== "" ? phone : undefined,
    };
    // await productModel.updateOne({_id:productId},{$set:{
   
    await addressModel.updateOne({ _id: id }, { $set: updateFields });
    console.log(updateFields);
    res.redirect(`/addresses`);
  } catch (error) {
    console.log(error);
    next(error)
  }    
},
deleteAddress: async(req,res)=>{
  try {
    const addressId = req.params.id; 
    console.log(addressId);

    const deleteAdd = await addressModel.deleteOne({ _id: addressId });

    if (deleteAdd.deletedCount > 0) {
        res.redirect('/addresses');
    } else {
        res.status(404).send('Unable to find the address');
    }
  } catch (error) {
    res.status(500).redirect('/500');  }
}
,
removeFromCart: async (req, res) => {
  try {
      const productId = new ObjectId(req.params.id);
      const token = req.cookies.UserToken;
      const userData = tokenVerification(token);
      const userId = new ObjectId(userData._id);
      
      const cartItem = await cartModel.findOne({
          userId: userData._id,
          "products.productId": productId,
      });

      const index = cartItem.products.findIndex(
          (product) => product.productId.equals(productId)
      );

      if (index === -1) {
          console.log("Product Not Found in Cart");
          return res.status(404).json({ success: false, message: "Product not found in cart" });
      }

      cartItem.products.splice(index, 1);
      await cartItem.save();

      res.json({ success: true, message: "Product removed from cart" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
},


postCart : async(req,res)=>{
try {
  console.log(req.body);
} catch (error) {
  console.log(error.message);
}
},

removeFromWishlist :async( req,res)=>{
  try {
    const productId = new ObjectId(req.params.id); 
    console.log(productId);
    const token= req.cookies.UserToken;
    const userData= tokenVerification(token);
    const deleteProduct = await wishlistModel.deleteOne({productId: productId ,userId: new ObjectId(userData._id)});

    if (deleteProduct.deletedCount > 0) {
        res.redirect('/wishlist');
    } else {
        res.status(404).send('Product not found');
    }
} catch (error) {
    console.log(error);
    res.status(500).send('Server Error');
}
},


getCheckOutPage : async (req,res)=>{

try {
  console.log('inside checkOut page');
  // const discount= req.session.discount;
  const data=req.session.cartData;
  const flat_rate=30;
  const couponDiscount=data.couponDiscount ||0;
  // console.log(discount);
    const totals=req.session.data;
    const token= req.cookies.UserToken;
    const userData= tokenVerification(token);
    const userId  = new ObjectId(userData._id)
    const grandTotal=Math.round(req.session.grandTotal);  
    const addressData = await addressModel.find({userId:userId});
    const wallet = await walletModel.findOne({userId:userId})
    const { products, quantities, prices  } = data;
    const productIds = products.map(productId => new ObjectId(productId));

    const productDetails = await productModel.find({ _id: { $in: productIds } });

    const checkoutDetails = productDetails.map((product, index) => {
      return {
        productId: product._id,
        name: product.pname,
        price: product.price,
        image: product.image, 
        checkoutQuantity: parseInt(quantities[index]),
        price: parseFloat(prices[index]), 
        totalPrice: parseFloat(prices[index]) * parseInt(quantities[index]),      };
    });

    let walletAmount;
    if(wallet){
     walletAmount= wallet.balance;
    }else{
      walletAmount=0;
    }
    console.log(checkoutDetails,"products from cart");
    // console.log(addressData.house_no);
    req.session.cartItems=req.body;
    // const grandTotal=totals.subtotal;
    res.render('user/checkOut',{
    title:'checkout_page',
    addressData,
    grandTotal,
    couponDiscount,
    flat_rate,
    walletAmount,
    checkoutDetails,

  })
} catch (error) {
  console.log(error.message);
}


},
searchProduct: async (req,res)=>{
  try {
      
      const search=req.body.String;
      
      const count = await productModel.countDocuments({
        $or: [
          {name: { $regex: search, $options: "i" } },
          {description: { $regex: search, $options: "i" } },
       
        ],
      });
      const perPage = 8;
      const page = req.query.page || 1;
  
    
      const result = await productModel.find({
        $or: [
          {name: { $regex: search, $options: "i" } },
          {description: { $regex: search, $options: "i" } },
       
        ],
      })
              .skip((perPage * page) - perPage)
              .limit(perPage);
  
  
          res.render('user/searchResult', {
              products: result,
              currentPage: parseInt(page),
              totalPages: Math.ceil(count / perPage)
          });
      // res.render('user/searchResult',{
      //   title:'search result',
      //   products:result
      // })
    } catch (error) {
      console.log(error);
    }

  

} ,

getAddresses: async (req,res)=>{
  try {
    const token= req.cookies.UserToken;

                const userData= tokenVerification(token);
                console.log(userData._id);
                const addresses = await addressModel.find({userId:userData._id})
                console.log(addresses);
    res.render('user/addresses',{
      title:'Addresses',
      addresses,
    })
  } catch (error) {
    console.log(error.message);
  }
},

getAccountPage : async (req,res)=>{
  try {
    res.render('user/account',{
      title:'Account',
  })
  } catch (error) {
    console.log(error.message);
    res.status(500).redirect('/500');
  }
},

getWishlist: async( req,res)=>{
  try {
    const productId = req.params.id;
  console.log("ho",productId);
  const token= req.cookies.UserToken;
  const userData= tokenVerification(token);
      const productData = await productModel.findOne({_id:productId});
      const userId  = new ObjectId(userData._id)
     
      
  //  console.log(req.body.quantity);
  //  console.log(productData.pname);
      const data = await  wishlistModel.collection.insertOne({
          userId:userId,
          productId:productData._id,
          
          
          
      });
      console.log(data);
      req.session.wishlistMessage='successfully added';
      res.redirect('/shop')
  } catch (error) {
    res.status(500).redirect('/500');  }
},



getWishlistPage: async (req, res) => {
  try {
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);

    // Fetch all wishlist items for the user
    const productsData = await wishlistModel.find({ userId: userData._id });
    const productIds = productsData.map(item => item.productId);

    const perPage = 8;
    const page = req.query.page || 1;

    // Fetch products from the database, populating category data
    const products = await productModel.find({ _id: { $in: productIds } })
      .skip((perPage * page) - perPage)
      .limit(perPage)
      .populate('category'); // Populate category data

    const count = await productModel.countDocuments({ _id: { $in: productIds } });

    // Define availability labels
    let available = 'In Stock';
    let not_available = 'Out Of Stock';

    // Modify products to include both originalPrice and finalPrice
    const modifiedProducts = await Promise.all(products.map(async (product) => {
      let finalPrice = product.price; // Start with the original price
      let originalPrice = product.price; // Store the original price separately

      // Check for product offer
      if (product.productOffer && product.productOffer > 0) {
        finalPrice = product.price - (product.price * product.productOffer / 100); // Apply product offer
      }

      // If no product offer, check the category's offer
      if (!product.productOffer && product.category) {
        const category = await categoryModel.findById(product.category); // Fetch category by ID
        if (category && category.categoryOffer && category.categoryOffer > 0) {
          finalPrice = product.price - (product.price * category.categoryOffer / 100); // Apply category offer
        }
      }

      // Store both originalPrice and finalPrice
      product.originalPrice = originalPrice; 
      product.finalPrice = finalPrice;
      return product; // Return modified product
    }));

    // Render wishlist page with modified products
    res.render('user/wishlist', {
      products: modifiedProducts,
      available,
      not_available,
      title: 'Wishlist',
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / perPage)
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while fetching the wishlist.");
  }
},



getMyWallet: async (req, res) => {
  try {
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
    const userId = userData._id;
    const perPage = 8;
    const page = parseInt(req.query.page) || 1; // Current page number
    
    // Get the user's wallet
    const wallet = await walletModel.findOne({ userId: userId });
    
    if (!wallet) {
      return res.render('user/userWallet', {
        walletBalance: 0,
        transactions: [],
        transactionCount: 0,
        wallet: 0,
        currentPage: page,
        totalPages: 0,
      });
    }

    // Sort transactions by date (new to old)
    wallet.transactionDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get the total number of transactions
    const transactionCount = wallet.transactionDetails.length;

    // Paginate transactions
    const paginatedTransactions = wallet.transactionDetails.slice(
      (perPage * (page - 1)),
      (perPage * page)
    );

    // Calculate the total number of pages
    const totalPages = Math.ceil(transactionCount / perPage);

    // Render the wallet page with paginated transactions
    res.render('user/userWallet', {
      title: 'my_wallet',
      wallet: wallet,
      transactions: paginatedTransactions,
      transactionCount: transactionCount,
      currentPage: page,
      totalPages: totalPages
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching wallet transactions");
  }
},




  updateEditProfile: async (req, res) => {
    try {
      const userId = req.params.id;
      const { name, phone, email } = req.body;
  
      const existingEmail = await userModel.findOne({ email: req.body.email, _id: { $ne: userId } });
      const existingPhone = await userModel.findOne({ phone: req.body.phone, _id: { $ne: userId } });
  
      if (existingEmail) {
        const user = await userModel.findOne({ _id: userId });
        const address = await addressModel.findOne({ userId });
        return res.render('user/userProfile', {
          message: 'Email already exists',
          data: user,
          address: address,
          errorType: 'email' 
        });
      }
  
      if (existingPhone) {
        const user = await userModel.findOne({ _id: userId });
        const address = await addressModel.findOne({ userId });
        return res.render('user/userProfile', {
          message: 'Phone number already exists',
          data: user,
          address: address,
          errorType: 'phone' 
        });
      }
  
      await userModel.updateOne({ _id: userId }, { $set: { name, email, phone } });
  
      return res.redirect(`/user-account?status=success`);
  
    } catch (error) {
      console.log(error.message);
      res.status(500).redirect('/500');    }
  },
  
  


  
 placeOrder : async (req, res) => {
  try {
    const checkOutData = req.body;
    const data = req.session.cartData;
    req.session.grandTotal = req.body.total;
    
    // Verify user authentication
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
    if (!userData) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
  
    const userId = new ObjectId(userData._id);
    const cartData = await cartModel.findOne({ userId: userId });
    const totalAmount = Math.round(parseFloat(req.body.total));
    req.session.total = totalAmount;
  
    if (!cartData || cartData.products.length === 0) {
      return res.status(400).send('Cart is empty. Cannot place order.');
    }
  
    let totalOfferDiscount = 0; // Initialize total offer discount
    const coupon = checkOutData.couponCode ? await couponModel.findOne({ code: checkOutData.couponCode }) : null;
    const couponValue = coupon ? parseFloat(coupon.value) : 0; // Get coupon value if present
  
    // Prepare product details and calculate applied offers and coupon discounts
    const productDetails = await Promise.all(data.products.map(async (productId, index) => {
      const product = await productModel.findById(new ObjectId(productId));
      const quantity = parseInt(data.quantities[index]);
      const priceFromGrandTotal = parseFloat(data.prices[index]);
      const calculatedPrice = priceFromGrandTotal / quantity;
  
      let appliedOffer = 0;
      if (product.price !== calculatedPrice) {
        appliedOffer = product.price - calculatedPrice; // Calculate applied offer
        totalOfferDiscount += appliedOffer * quantity; // Accumulate the total offer discount
      }
     let offerPrice = product.price-appliedOffer;
      // Calculate individual coupon discount for this product
      let couponDiscount = 0;
      if (coupon) {
        couponDiscount = (calculatedPrice * quantity * couponValue) / 100; // Calculate coupon discount per product
      }
  
      return {
        productId: new ObjectId(productId),
        quantity,
        price: product.price,
        offerPrice,
        appliedOffer,
        couponDiscount, // Include coupon discount for this product
      };
    }));
  
    // Log or send the product details with individual discounts
    console.log("Product Details with Discounts:", productDetails);
      // console.log('Product Details with Offers:', productDetails);
      // console.log('Total Offer Discount:', totalOfferDiscount);
  
      // Wallet Payment Logic
      if (req.body.payment === 'wallet') {
        const walletData = await walletModel.findOne({ userId: userId });
        if (!walletData) {
          return res.status(400).json({ success: false, message: 'No wallet found for the user.' });
        }
  
        const walletBalance = walletData.balance;
  
        if (walletBalance >= totalAmount) {
          walletData.balance -= totalAmount;
          await walletData.save(); // Save the updated wallet balance
  
          const orderId = generateOrderId();
          const updatedProductDetails = productDetails.map(product => ({
            ...product,
            productOrderStatus: 'Confirmed',  // Add this field to each product
          }));
      
          await orderModel.collection.insertOne({
            userId: userId,
            deliveryAddress: new ObjectId(req.body.address),
            productsDetails: updatedProductDetails,  // Use the updated array
            paymentDetails: {
              method: req.body.payment,
              orderId: orderId,
            },
            couponDiscount: checkOutData.couponDiscount,
            couponCode: checkOutData.couponCode,
            offerDiscount: totalOfferDiscount,
            grandTotal: totalAmount,
            orderStatus: 'Confirmed',
            placedAt: new Date(),
          });
  
          for (const product of productDetails) {
            await productModel.updateOne(
              { _id: product.productId },
              { $inc: { quantity: -Number(product.quantity) } }
            );
          }
  
          if (checkOutData.couponCode) {
            const coupon = await couponModel.findOne({ code: checkOutData.couponCode });
  
            if (coupon && !coupon.redeemedBy.includes(userId)) {
              coupon.redeemedBy.push(userId);
              await coupon.save();
            }
          }
  
          await cartModel.updateOne(
            { userId: userId },
            { $set: { products: [] } }
          );
  
          walletData.transactionDetails.push({
            orderId: orderId,
            paymentType: 'Debit',
            date: new Date(),
            amount: totalAmount
          });
  
          await walletData.save();
  
          return res.json({ success: true, orderId: orderId });
        } else {
          return res.json({ success: false, message: 'Insufficient wallet balance. Please choose another payment method.' });
        }
      } else if (req.body.payment === 'razorpay') {
        const options = {
          amount: totalAmount * 100, // Razorpay accepts amounts in paise
          currency: "INR",
          receipt: `receipt_order_${new Date().getTime()}`,
        };
  
        const razorpayOrder = await razorpay.orders.create(options);
  
        const orderId = generateOrderId();
  
       const orderData= await orderModel.collection.insertOne({
          userId: userId,
          deliveryAddress: new ObjectId(req.body.address),
          productsDetails: productDetails,
          paymentDetails: {
            method: req.body.payment,
            orderId: razorpayOrder.id,
          },
          couponDiscount: checkOutData.couponDiscount,
          couponCode: checkOutData.couponCode,
          offerDiscount: totalOfferDiscount,
          grandTotal: totalAmount,
          orderStatus: 'payment pending', // Initially set as 'payment pending'
          placedAt: new Date(),
        });
  
        // for (const product of productDetails) {
        //   await productModel.updateOne(
        //     { _id: product.productId },
        //     { $inc: { quantity: -Number(product.quantity) } }
        //   );
        // }
  
        await cartModel.updateOne(
          { userId: userId },
          { $set: { products: [] } }
        );
  
        return res.json({
          success: true,
          key_id: process.env.RAZORPAY_KEY_ID,
          order_id: razorpayOrder.id, // Razorpay order ID
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Tick-Track",
          description: "Test Transaction",
          orderId: orderData.insertedId, // MongoDB order ID
          contact: userData.phone,
          email: userData.email,
        });
      
      } else if (req.body.payment === 'COD') {
        const orderId = generateOrderId();
        const updatedProductDetails = productDetails.map(product => ({
          ...product,
          productOrderStatus: 'Confirmed',  // Add this field to each product
        }));
        await orderModel.collection.insertOne({
          userId: userId,
          deliveryAddress: new ObjectId(req.body.address),
          productsDetails: updatedProductDetails,
          paymentDetails: {
            method: req.body.payment,
            orderId: orderId,
          },
          couponDiscount: checkOutData.couponDiscount,
          couponCode: checkOutData.couponCode,
          offerDiscount: totalOfferDiscount,
          grandTotal: totalAmount,
          orderStatus: 'Confirmed',
          placedAt: new Date(),
        });
  
        for (const product of productDetails) {
          await productModel.updateOne(
            { _id: product.productId },
            { $inc: { quantity: -Number(product.quantity) } }
          );
        }
  
        if (checkOutData.couponCode) {
          const coupon = await couponModel.findOne({ code: checkOutData.couponCode });
  
          if (coupon && !coupon.redeemedBy.includes(userId)) {
            coupon.redeemedBy.push(userId);
            await coupon.save();
          }
        }
  
        await cartModel.updateOne(
          { userId: userId },
          { $set: { products: [] } }
        );
  
        return res.status(200).json({
          success: true,
          orderId: orderId,
        });
      } else {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
      }
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },


  verifyPayment: async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
      console.log(req.body, "verify");
  
      // Check for missing payment details
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
      }
  
      // Verify payment signature
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');
  
      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
  
      // Verify user authentication
      const token = req.cookies.UserToken;
      const userData = tokenVerification(token);
      if (!userData) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }
  
      // Fetch order details from the database
      const order = await orderModel.findOne({ _id: new ObjectId(orderId) });
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Get the products from the order details
      const productDetails = order.productsDetails; // Assuming productsDetails contains ordered products and their quantities
  
      const updatedOrder = await orderModel.updateOne(
        { _id: new ObjectId(orderId) },
        {
          $set: {
            orderStatus: 'Confirmed',
            placedAt: new Date(),
            "productsDetails.$[].productOrderStatus": 'Confirmed', // Update productOrderStatus for each product in the array
          },
        }
      );
  
      // Reduce stock for each product in the order
      for (const product of productDetails) {
        const productId = new ObjectId(product.productId); // Ensure productId is ObjectId
        const quantity = Number(product.quantity); // Ensure quantity is a valid number
  
        if (!isNaN(quantity) && quantity > 0) {
          await productModel.updateOne(
            { _id: productId },
            { $inc: { quantity: -quantity } } // Reduce stock by ordered quantity
          );
        } else {
          console.error(`Invalid quantity for product: ${productId}`);
        }
      }

      // If everything is successful, return the response
      return res.json({ success: true, message: 'Payment verified successfully', orderId });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  },
  
  
  

  
  retryOrder: async (req, res) => {
    try {
        // Extract orderId from the request body
        const { orderId } = req.body; // Assuming orderId is sent in the request body as JSON

        const orderData= await orderModel.findOne({_id:new ObjectId(orderId)});
        try {
            const paymentCapture = 1; // Automatic payment capture
            const currency = 'INR';
            const amount = orderData.grandTotal; // Amount in paise (e.g., 500.00 INR is 50000 paise)

            const options = {
                amount: amount * 100, // amount in smallest currency unit
                currency,
                receipt: String(orderId), // Ensure receipt is a string
                payment_capture: paymentCapture
            };

            // Create Razorpay order
            const response = await razorpay.orders.create(options);

            // Send response back to the client
            res.json({
                success: true,
                key: process.env.RAZORPAY_KEY_ID, // Send Razorpay key to frontend
                orderId: response.id, // Razorpay order ID
                currency: response.currency,
                amount: response.amount
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Unable to create Razorpay order.' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).json({ success: false, error: 'Invalid request.' }); // Return a proper error response
    }
},


getOrderSuccess: async (req , res) => {
  try {
      console.log("inside order success");
      res.render('user/orderSuccessfull', {
          title: 'Order Successful'
      });
  } catch (error) {
      console.error("Error rendering order success page:", error.message);
      res.status(500).send('Internal Server Error'); // Send a response if rendering fails
  }
},


getOrderFailed : async(req,res)=>{
  try {
    res.render("user/orderFailed",{
      title:'order_failed'
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).redirect('/500');
  }
},




getMenCategory: async (req, res) => {
  try {
      const data = await categoryModel.find({ cname: 'Men' }, { _id: 1 });
      const categoryId = data.length ? data[0]._id : null; // Get the category ID
      const perPage = 8;
      const page = parseInt(req.query.page) || 1;
      const sortOption = req.query.sort || ''; // Get sort option from query params

      // Determine sorting criteria based on sortOption
      let sortCriteria = {};
      if (sortOption === 'low_to_high') {
          sortCriteria = { price: 1 };  // Sort by price ascending
      } else if (sortOption === 'high_to_low') {
          sortCriteria = { price: -1 }; // Sort by price descending
      }

      // Fetch products with pagination, sorting, and populate the category
      const products = await productModel.find({ category: categoryId })
          .populate('category')
          .sort(sortCriteria)  // Apply sorting here
          .skip((perPage * page) - perPage)
          .limit(perPage);

      const categories = await categoryModel.find({ categoryOffer: { $ne: '0' } });

      // Create a map of categories for easier access
      const categoryMap = {};
      categories.forEach(category => {
          categoryMap[category._id] = category.categoryOffer;
      });

      // Calculate offerPrice for each product
      const productsWithOfferPrice = products.map(product => {
          let offerPrice = product.price; // Default to original price

          // Check for productOffer
          if (product.productOffer) {
              offerPrice = product.price - (product.price * product.productOffer / 100);
          } 
          // Check for categoryOffer
          else if (product.category && categoryMap[product.category._id]) {
              const categoryOffer = categoryMap[product.category._id];
              offerPrice = product.price - (product.price * categoryOffer / 100);
          }

          return {
              ...product.toObject(), // Convert to plain object
              offerPrice: offerPrice.toFixed(2) // Format offerPrice to 2 decimal places
          };
      });

      const count = await productModel.countDocuments({ category: categoryId });
      
      res.render('user/filter', {
          data: productsWithOfferPrice,
          categoryMap,
          sortOption, // Pass sortOption to the view
          currentPage: page,
          totalPages: Math.ceil(count / perPage)
      });
  } catch (error) {
      console.log(error.message);
      res.status(500).redirect('/500');  }
},


getWomenCategory: async (req, res) => {
  try {
      const data = await categoryModel.find({ cname: 'Women' }, { _id: 1 });
      const categoryId = data.length ? data[0]._id : null; // Get the category ID
      const perPage = 8;
      const page = parseInt(req.query.page) || 1;
      const sortOption = req.query.sort || ''; // Get sort option from query params

      let sortCriteria = {};
      if (sortOption === 'low_to_high') {
          sortCriteria = { price: 1 };  // Sort by price ascending
      } else if (sortOption === 'high_to_low') {
          sortCriteria = { price: -1 }; // Sort by price descending
      }

      // Fetch products with pagination, sorting, and populate the category
      const products = await productModel.find({ category: categoryId }) // Filter by the women category
          .populate('category')
          .sort(sortCriteria)  // Apply sorting here
          .skip((perPage * page) - perPage)
          .limit(perPage);

      const categories = await categoryModel.find({ categoryOffer: { $ne: '0' } });

      // Create a map of categories for easier access
      const categoryMap = {};
      categories.forEach(category => {
          categoryMap[category._id] = category.categoryOffer;
      });

      // Calculate offerPrice for each product
      const productsWithOfferPrice = products.map(product => {
          let offerPrice = product.price; // Default to original price

          // Check for productOffer
          if (product.productOffer) {
              offerPrice = product.price - (product.price * product.productOffer / 100);
          } 
          // Check for categoryOffer
          else if (product.category && categoryMap[product.category._id]) {
              const categoryOffer = categoryMap[product.category._id];
              offerPrice = product.price - (product.price * categoryOffer / 100);
          }

          return {
              ...product.toObject(), // Convert to plain object
              offerPrice: offerPrice.toFixed(2) // Format offerPrice to 2 decimal places
          };
      });

      const count = await productModel.countDocuments({ category: categoryId });
      
      res.render('user/filter', {
          data: productsWithOfferPrice,
          categoryMap,
          sortOption,
          currentPage: page,
          totalPages: Math.ceil(count / perPage)
      });
  } catch (error) {
      console.log(error.message);
      res.status(500).redirect('/500');  }
},

  getUnisexCategory: async (req,res)=>{
    try {
      const data = await categoryModel.find({ cname: 'Unisex' }, { _id: 1 });
      const categoryId = data.length ? data[0]._id : null; // Get the category ID
      const perPage = 8;
      const page = parseInt(req.query.page) || 1;
      const sortOption = req.query.sort || ''; // Get sort option from query params

      let sortCriteria = {};
      if (sortOption === 'low_to_high') {
          sortCriteria = { price: 1 };  // Sort by price ascending
      } else if (sortOption === 'high_to_low') {
          sortCriteria = { price: -1 }; // Sort by price descending
      }

      // Fetch products with pagination, sorting, and populate the category
      const products = await productModel.find({ category: categoryId }) // Filter by the women category
          .populate('category')
          .sort(sortCriteria)  // Apply sorting here
          .skip((perPage * page) - perPage)
          .limit(perPage);

      const categories = await categoryModel.find({ categoryOffer: { $ne: '0' } });

      // Create a map of categories for easier access
      const categoryMap = {};
      categories.forEach(category => {
          categoryMap[category._id] = category.categoryOffer;
      });

      // Calculate offerPrice for each product
      const productsWithOfferPrice = products.map(product => {
          let offerPrice = product.price; // Default to original price

          // Check for productOffer
          if (product.productOffer) {
              offerPrice = product.price - (product.price * product.productOffer / 100);
          } 
          // Check for categoryOffer
          else if (product.category && categoryMap[product.category._id]) {
              const categoryOffer = categoryMap[product.category._id];
              offerPrice = product.price - (product.price * categoryOffer / 100);
          }

          return {
              ...product.toObject(), // Convert to plain object
              offerPrice: offerPrice.toFixed(2) // Format offerPrice to 2 decimal places
          };
      });

      const count = await productModel.countDocuments({ category: categoryId });
      
      res.render('user/filter', {
          data: productsWithOfferPrice,
          categoryMap,
          sortOption,
          currentPage: page,
          totalPages: Math.ceil(count / perPage)
      });
  } catch (error) {
      console.log(error.message);
      res.status(500).redirect('/500');  }
    },

 


getFilter : async (req, res) => {
  let sortQuery = {};
  
  // Check the 'sort' query parameter and update the sortQuery accordingly
  if (req.query.sort === 'low_to_high') {
    sortQuery = { price: 1 };  // Ascending price
  } else if (req.query.sort === 'high_to_low') {
    sortQuery = { price: -1 }; // Descending price
  }
  
  try {
    // Fetch products from the database with sorting
    const products = await Product.find().sort(sortQuery);
    
    // Pass the 'sort' query parameter to the EJS template
    res.render('user/filter', {
      data: products,
      currentPage: req.query.page || 1,
      totalPages: Math.ceil(products.length / ITEMS_PER_PAGE),
      sort: req.query.sort || ''  // Ensure 'sort' is always passed
    });
  } catch (err) {
    console.error(err);
    res.redirect('/error');
  }
},
  

myOrders : async (req,res)=>{
  try {
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
   
    const perPage = 8;
    const page = req.query.page || 1;
    const orders = await orderModel.aggregate ([{
      $match : {
        userId : new ObjectId(userData._id)
      }
    },{$unwind : "$productsDetails"},
    {$lookup:{
      from : "products",
      localField : "productsDetails.productId",
      foreignField : "_id",
      as : "productInfo"
    }},{$unwind : "$productInfo"},
    {$lookup:{
      from : "addresses",
      localField : "deliveryAddress",
      foreignField : "_id",
      as : "address",

    }},{$unwind : "$address"},

    {
      $sort: { placedAt: -1 } 
    }

  ])
    .skip((perPage * page) - perPage)
            .limit(perPage);
            orders.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

    const count= await orderModel.countDocuments({userId:new ObjectId(userData._id)})
    console.log(orders,'my orders ');
    res.render("user/myOrders",{
      orders:orders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / perPage)
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).redirect('/500');
  }
},




getOrderDetailPage: async (req, res, next) => {
  try {
    // Fetch the order using its ID
    const orderId = new ObjectId(req.params.id);
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
   const userId=new ObjectId(userData._id);
   console.log(userId);
   console.log(orderId);
    // Fetch the user details
    const userModel= require('../models/userModel');
    const user = await userModel.findOne({ _id:userId});

    // Fetch the order by ID (get all the details from the orderModel)
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Fetch the address details using the deliveryAddress ID from orderModel
    const addressDetails = await addressModel.findById(order.deliveryAddress);

    // Fetch product details (e.g., pname, image, description) from productModel using the productIds from order.productsDetails
    const productIds = order.productsDetails.map(product => product.productId);
    const productsDetails = await productModel.find({
      _id: { $in: productIds }
    }, 'pname image description'); // Only fetch necessary fields

    // Prepare the response object
    const orderDetails = {
      orderId: order._id,
      userId: order.userId,
      deliveryAddress: addressDetails ? {
        id: addressDetails._id,
        house_no: addressDetails.house_no,
        street: addressDetails.street,
        city: addressDetails.city,
        state: addressDetails.state,
        pincode: addressDetails.pincode,
        district: addressDetails.district,
        country: addressDetails.country,
      } : null,
      products: order.productsDetails.map(product => {
        console.log('Full Product Object:', product);  // Log the entire product object
    
        // Find product details from productModel
        const productDetail = productsDetails.find(p => p._id.toString() === product.productId.toString());
    
        // Access fields from the order's product details
        return {
            productId: product.productId,
            quantity: product.quantity,
            offerPrice:product.offerPrice,

            pname: productDetail ? productDetail.pname : 'Unknown',  // Fetch product name
            price: product.price,  // Access price from orderModel's productDetails
            image: productDetail ? productDetail.image : 'no-image.jpg',  // Fetch the image
            description: productDetail ? productDetail.description : 'No description available',  // Fetch the description
            appliedOffer: product.appliedOffer !== undefined ? product.appliedOffer : 0,  // Access appliedOffer
            couponDiscount: product.couponDiscount !== undefined ? product.couponDiscount : 0,  // Access couponDiscount
            productOrderStatus:product.productOrderStatus,
            cancellationReason: product.cancellationReason || 'No reason provided',  // Provide cancellation reason
            isCanceled: product.isCanceled || false,  // Cancellation status
            refundAmount: product.refundAmount || 0,  // Refund amount, if applicable
        };
    }),
    
      paymentDetails: {
        method: order.paymentDetails ? order.paymentDetails.method : 'N/A',
        orderId: order.paymentDetails ? order.paymentDetails.orderId : null,
        paymentId: order.paymentDetails ? order.paymentDetails.paymentId : null,
      },
      grandTotal: order.grandTotal,
      orderStatus: order.orderStatus,
      couponDiscount: order.couponDiscount || null,
      offerDiscount: order.offerDiscount || 0,
      placedAt: formatDate(order.placedAt),
      cancelRequested: order.cancelRequested,
      cancellationReason: order.cancellationReason || null,
      refundAmount: order.refundAmount || 0
    };
console.log(orderDetails,"checkingggg");
    // Render the page with the order details
    req.session.orderId = orderId;
    res.render("user/orderDetailedPage", {
      title: "Order Details",
      user,
      orderId,
      order: orderDetails, // Pass the entire object of order details
    });
  } catch (error) {
    console.error(error.message);
    throw error; // Or handle error as needed
  }
},



getCouponPage:async (req,res)=>{
try {
  const today = new Date();
  const perPage = 8;
  const page = req.query.page || 1;
  const coupons = await couponModel.aggregate([
    {
      // Match coupons that are not deleted and have not expired
      $match: {
        isDeleted: false,
        expiresAt: { $gte: today } // Ensure expiresAt is greater than or equal to today's date
      }
    },
    
  ]).skip((perPage * page) - perPage)
  .limit(perPage);
  const count= await couponModel.countDocuments({isDeleted:false});

  console.log("Non-expired coupons with category names:", coupons);
  
  
  
  
  
  res.render('user/userCoupon', { coupons,
    currentPage: parseInt(page),
    totalPages: Math.ceil(count / perPage),
   });
} catch (error) {
  console.log(error.message);
}
},

userCancelOrder: async (req, res) => {
  try {
    console.log('Request to cancel order received', req.body);
    const { orderId, productIds, reason } = req.body;

    // Fetch the order details
    const order = await orderModel.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const objectIdProductIds = productIds.map(id => new mongoose.Types.ObjectId(id));

    let totalRefundAmount = 0; // Variable to store total refund amount for all canceled products

    // Create an array to store the update operations for each productId
    const updates = objectIdProductIds.map(productId => {
      const product = order.productsDetails.find(p => p.productId.toString() === productId.toString());

      if (product && !product.isCanceled) {
        // Calculate refund amount for the product
        const refundAmount = product.price - (product.appliedOffer || 0) - (product.couponDiscount || 0);
        totalRefundAmount += refundAmount; // Add the refund amount to the total

        return {
          updateOne: {
            filter: {
              _id: orderId,
              "productsDetails.productId": productId // Match the order and the specific product
            },
            update: {
              $set: {
                "productsDetails.$.isCanceled": true,
                "productsDetails.$.cancellationReason": reason,
                "productsDetails.$.productOrderStatus": "Cancelled",
                "productsDetails.$.refundAmount": refundAmount // Set the refund amount for the product
              },
              $inc: {
                refundAmount: refundAmount // Increment the refundAmount at the root level of the order
              }
            }
          }
        };
      }
    }).filter(update => update !== undefined); // Filter out undefined updates

    // Execute bulk updates if there are any updates to perform
    if (updates.length > 0) {
      const bulkWriteResult = await orderModel.bulkWrite(updates);

      // Increment product quantities in productModel for each canceled product based on the order quantity
      const productQuantityUpdates = objectIdProductIds.map(productId => {
        const product = order.productsDetails.find(p => p.productId.toString() === productId.toString());
        if (product && product.quantity) {
          return {
            updateOne: {
              filter: { _id: productId }, // Match product by id
              update: { $inc: { quantity: product.quantity } } // Increment product quantity by the quantity in the order
            }
          };
        }
      }).filter(update => update !== undefined);

      await productModel.bulkWrite(productQuantityUpdates);

      // Handle refund to the wallet if the payment method is 'razorpay' or 'wallet'
      if (order.paymentDetails.method === 'razorpay' || order.paymentDetails.method === 'wallet') {
        // Find the wallet by userId
        const existUser = await walletModel.findOne({ userId: order.userId });

        if (!existUser) {
          // If no wallet exists for the user, create a new wallet
          await walletModel.create({
            userId: order.userId,
            balance: totalRefundAmount, // Initial balance is the total refund amount
            transactionDetails: [{
              orderId: order._id,
              paymentType: 'credit',
              date: new Date(),
              amount: totalRefundAmount
            }],
          });
        } else {
          // If wallet exists, update the balance and add to transactionDetails array
          await walletModel.updateOne(
            { userId: order.userId },
            {
              $inc: { balance: totalRefundAmount }, // Increment balance by the total refund amount
              $push: {
                transactionDetails: {
                  orderId: order._id,
                  paymentType: 'credit',
                  date: new Date(),
                  amount: totalRefundAmount
                }
              }
            }
          );
        }
      }

      console.log(bulkWriteResult, "bulkWriteResult");
      res.json({ success: true, message: 'Order cancellation successful, refund processed, and product quantity updated.', result: bulkWriteResult });
    } else {
      res.json({ success: false, message: 'No products found for cancellation.' });
    }

  } catch (error) {
    console.error('Error cancelling order:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
},




userReturnReq: async (req, res) => {
  try {
    console.log("Return request", req.body);
    
    const orderId = new ObjectId(req.body.orderId); 
    const reason = req.body.reason; 
    const productId = new ObjectId(req.body.productId);
    // Fetch the order to get grandTotal and userId
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    // Update the order status and request cancellation
    // Update the order status and request cancellation
await orderModel.updateOne(
  { 
    _id: orderId, 
    'productsDetails.productId': productId // Match orderId and productId
  },
  {
    $set: {
      'productsDetails.$.returnReason':reason, 
      'productsDetails.$.productOrderStatus': "Pending" // Update the specific product's status
    }
  }
);


    // const amountToRefund = order.grandTotal; 
    // const existUser = await walletModel.findOne({ userId: order.userId });

    // if (!existUser) {
    //   await walletModel.create({
    //     userId: order.userId,
    //     balance: amountToRefund, 
    //     transactionDetails: [{
    //       orderId: order.paymentDetails.orderId,
    //       paymentType: 'Credit',
    //       date: new Date(),
    //       amount: amountToRefund
    //     }],
    //   });
    // } else {
    //   await walletModel.updateOne(
    //     { userId: order.userId },
    //     {
    //       $inc: { balance: amountToRefund }, // Increment balance by refund amount
    //       $push: {
    //         transactionDetails: {
    //           orderId: order.paymentDetails.orderId,
    //           paymentType: 'Credit',
    //           date: new Date(),
    //           amount: amountToRefund
    //         }
    //       }
    //     }
    //   );
    // }
    
    // console.log("Wallet updated successfully");
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing return request:", error.message);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
},

getCancelForPending: async (req, res) => {
  try {
      const orderId = new ObjectId(req.params.id); // Get the order ID from the request parameters
      const order = await orderModel.findById(orderId); // Find the order by ID

      // Check if the order exists and its status is 'payment pending'
      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }

      if (order.orderStatus === 'payment pending') {
          // Update all products in this order to have productOrderStatus as 'Cancelled' and isCanceled as true
          order.productsDetails.forEach(product => {
              product.productOrderStatus = 'Cancelled'; // Set product status to 'Cancelled'
              product.isCanceled = true; // Mark product as canceled
          });

          // Update the overall order status to 'Cancelled'
          order.orderStatus = 'Cancelled';

          // Save the updated order back to the database
          await order.save();

          return res.status(200).json({ message: 'Order cancelled successfully', order });
      } else {
          return res.status(400).json({ message: 'Order cannot be cancelled as it is not in pending state' });
      }
  } catch (error) {
      console.error('Error cancelling order:', error);
      return res.status(500).json({ message: 'Internal server error', error });
  }
},



 addMoney :async (req, res) => {
  const { amount } = req.body;
  console.log('Amount to add:', amount);

  // Validate amount
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${new Date().getTime()}`, // Unique receipt ID
    };

    const razorpayOrder = await razorpay.orders.create(options);
    return res.json({ orderId: razorpayOrder.id });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
},




paymentSuccess: async (req, res) => {
  console.log("Inside wallet payment success handler");

  // Destructure the necessary fields from the request body
  const { paymentId, orderId, signature, amount } = req.body;
  
  if (!paymentId || !orderId || !signature || !amount) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  try {
    // Verify user using the token from cookies
    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
    const userId = userData._id; // Get the user ID

    // Create the expected signature using Razorpay secret key
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY);
    hmac.update(`${orderId}|${paymentId}`); // Correctly reference the values from the request body
    const generatedSignature = hmac.digest('hex');

    // Validate the payment signature
    if (generatedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // If signature matches, update the user's wallet with the amount
    const wallet = await walletModel.findOneAndUpdate(
      { userId: userId },
      { 
        $inc: { balance: amount }, // Increment the wallet balance
        $push: { transactionDetails: { paymentType: 'credit', amount: amount, date: new Date() } } // Add transaction details
      },
      { new: true, upsert: true } // Ensure it creates a new wallet if not found
    );

    // Respond with success and the payment ID
    res.json({ success: true, message: 'Payment verified and wallet updated', transactionId: paymentId });
    
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({ success: false, message: 'Error updating wallet' });
  }
},

postApplyCoupon: async (req, res) => {
  try {
      const { couponCode, grandTotal } = req.body; // Get only couponCode and grandTotal
      const token = req.cookies.UserToken;
      const userData = tokenVerification(token);
      const userId = new ObjectId(userData._id);

      // Find the coupon
      const coupon = await couponModel.findOne({
          code: couponCode,
          isDeleted: false,
          expiresAt: { $gte: new Date() }
      });

      if (!coupon) {
          return res.status(400).json({ message: 'Invalid coupon code!' });
      }

      if (coupon.redeemedBy.includes(userId)) {
          return res.status(400).json({ message: 'This coupon has already been redeemed by you.' });
      }

      // Check if the grand total meets the minimum purchase requirement
      if (grandTotal < coupon.min_purchase) {
          return res.status(400).json({ message: `Minimum purchase of ₹${coupon.min_purchase} is required to use this coupon.` });
      }

      const flat_rate = 30; // Delivery charge
      const discountPercentage = coupon.value; // Use coupon's value as a percentage
      const discountAmount = (grandTotal * discountPercentage) / 100; // Calculate the discount amount
      const totalWithDiscount = grandTotal - discountAmount + flat_rate; // Calculate total after applying the coupon

      // Store the coupon information in the session if needed
      req.session.discount = discountAmount;
      req.session.couponCode = couponCode;

      return res.json({
          message: "Coupon applied successfully!",
          discountAmount,
          totalWithDiscount,
          flat_rate
      });

  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ message: 'Internal server error.' });
  }
},


redeemReferralCode: async (req, res) => {
  try {
    console.log(req.body, "referral code body");

    const token = req.cookies.UserToken;
    const userData = tokenVerification(token);
    const userId = userData._id; // Get the user ID
    const { referralCode } = req.body;
   const userModel = require("../models/userModel");
    const currentUser = await userModel.findOne({ _id: userId });

    if (currentUser.referralCodeRedeemed) {
      return res.status(400).json({ message: "You have already redeemed a referral code." });
    }

    const referralUser = await userModel.findOne({ referralCode: referralCode });

    if (!referralUser) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    if (referralUser._id.toString() === userId.toString()) {
      return res.status(400).json({ message: "You can't redeem your own referral code" });
    }

    await userModel.updateOne(
      { _id: userId },
      { $set: { referralCodeRedeemed: true } }
    );
 // fro current user
    const existUser = await walletModel.findOne({ userId: userId });

    if (!existUser) {
      await walletModel.create({
        userId: userId,
        balance: 100, 
        transactionDetails: [{
          orderId: 'RefferalAmountRedeemed',
          paymentType: 'credit',
          date: new Date(),
          amount: 100
        }],
      });
    } else {
      await walletModel.updateOne(
        { userId: userId },
        {
          $inc: { balance: 100 }, 
          $push: {
            transactionDetails: {
              orderId:'RefferalAmountRedeemed',
              paymentType: 'credit',
              date: new Date(),
              amount: 100,
            }
          }
        }
      );
    }
    // Set `redeemReferralCodeBy` on the user who owns the referral code
    await userModel.updateOne(
      { _id: referralUser._id },
      { $set: { redeemReferralCodeBy: userId } }
    );

const refferaluserExists =await walletModel.findOne({ userId: referralUser._id });

if (!refferaluserExists) {
  await walletModel.create({
    userId: userId,
    balance: 100, 
    transactionDetails: [{
      orderId: 'RefferalAmountRedeemed',
      paymentType: 'credit',
      date: new Date(),
      amount: 100
    }],
  });
} else {
  await walletModel.updateOne(
    { userId: referralUser._id },
    {
      $inc: { balance: 100 }, 
      $push: {
        transactionDetails: {
          orderId:'RefferalAmountRedeemed',
          paymentType: 'credit',
          date: new Date(),
          amount: 100,
        }
      }
    }
  );
}

    // Step 5: Return a success response
    res.status(200).json({success:true, message: "Referral code redeemed successfully!" });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "An error occurred during referral redemption" });
  }
}




  


}

















// addToCart : async (req,res)=>{
  
//   const cart= await cartModel.find(req.session.cartId );
//   if (!cart) {
//    // If no cart exists, create a new one
//    const newCart = new cartModel({
//        products: []
//    });
//    await newCart.save();
//    req.session.cartId = newCart._id;
//    cart = newCart;
// }
//   const productId = req.params.id;
//   const product = await productModel.findById(productId);
  
//   const itemIndex = cart.products.findIndex(p => p.productId == productId);

//   if (itemIndex > -1) {
//       cart.products[itemIndex].quantity += 1;
//   } else {
//       cart.products.push({ productId: productId, quantity: 1 });
//   }

//   await cart.save();
//   req.session.cartId = cart._id;
//   res.redirect('/cart');




// placeOrder: async(req, res) => {
//   try {
//     console.log(req.body.payment);
//     const token = req.cookies.UserToken;
//     const userData = tokenVerification(token);  
//     const cartData = await cartModel.findOne({ userId: new ObjectId(userData._id) });
    
//     if (!cartData || cartData.products.length === 0) {
//       return res.status(400).send('Cart is empty. Cannot place order.');
//     }

//     // Mapping product details from the cart
//     const productDetails = cartData.products.map((product) => {
//       return {
//         productId: new ObjectId(product.productId),
//         quantity: product.quantity
//       };
//     });
//     if(req.body.payment)
//     // Insert the order into the database
//     await orderModel.collection.insertOne({
//       userId: new ObjectId(userData._id),
//       deliveryAddress: new ObjectId(req.body.address),
//       productsDetails: productDetails,
//       paymentMethod: req.body.payment,
//       grandTotal: req.session.grandTotal,
//       orderStatus: 'confirm',
//       placedAt: new Date().toDateString()
//     });

//     // Decrease product quantities in the productModel
//     for (const product of productDetails) {
//       await productModel.updateOne(
//         { _id: product.productId },
//         { $inc: { quantity: -Number(product.quantity) } } // Decrease product quantity
//       );
//     }

//     // Clear the user's cart
//     await cartModel.updateOne(
//       { userId: new ObjectId(userData._id) },
//       { $set: { products: [] } }
//     );

//     // Render order successful page
//     res.render('user/orderSuccessfull');
//   } catch (error) {
//     console.log(error.message);
//     res.status(500).send('Error placing order');
//   }
// },