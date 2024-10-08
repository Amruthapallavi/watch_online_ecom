const userModel = require("../models/userModel");
const fs = require("fs");
const mongoose = require("mongoose");
const path= require("path");
const { title } = require("process");
const bodyParser= require('body-parser');
const adminModel = require("../models/adminModel");
const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const {ObjectId} = require('mongodb');
const multer=require('multer');
const orderModel = require("../models/orderModel");
const couponModel = require("../models/couponModel");
const { error } = require("console");
const walletModel = require("../models/walletModel");
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');







const getTopSellingProducts = async () => {
    return await orderModel.aggregate([
        { $unwind: '$productsDetails' }, // Unwind productsDetails array
        {
            $group: {
                _id: '$productsDetails.productId', // Group by productId
                totalQuantity: { $sum: '$productsDetails.quantity' } // Sum quantities for each product
            }
        },
        {
            $lookup: {
                from: 'products', // Lookup in the products collection
                localField: '_id', // Use _id (productId) as the matching field
                foreignField: '_id', // Match with _id in the products collection
                as: 'productDetails' // Store matching product details in productDetails
            }
        },
        { $unwind: '$productDetails' }, // Unwind productDetails to make it a single object
        {
            $project: {
                productId: '$_id', // Include the productId
                productDetails: 1,  // Return the full product details object
                totalQuantity: 1 // Return the total quantity sold for the product
            }
        },
        { $sort: { totalQuantity: -1 } }, // Sort products by total quantity in descending order
        { $limit: 10 } // Limit to top 10 products
    ]);
};

const getTopSellingCategories = async () => {
    return await orderModel.aggregate([
        // Unwind the productsDetails array to process each product separately
        { $unwind: '$productsDetails' },

        // Lookup to get the corresponding product details from the products collection
        {
            $lookup: {
                from: 'products',  // name of your products collection
                localField: 'productsDetails.productId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },

        // Group by the product's category and sum the quantities sold
        {
            $group: {
                _id: '$productDetails.category',  // Use product's category field
                totalQuantity: { $sum: '$productsDetails.quantity' }
            }
        },

        // Lookup to get the corresponding category details from the categories collection
        {
            $lookup: {
                from: 'categories',  // name of your categories collection
                localField: '_id',   // The category ID from the grouping
                foreignField: '_id', // The actual category ID in the categories collection
                as: 'categoryDetails'
            }
        },
        { $unwind: '$categoryDetails' },

        // Project the fields we need: category name and total quantity sold
        {
            $project: {
                categoryId: '$_id',
                categoryName: '$categoryDetails.cname', // Adjust according to your schema
                totalQuantity: 1
            }
        },

        // Sort by total quantity sold in descending order
        { $sort: { totalQuantity: -1 } },

        // Limit to top 3 categories
        { $limit: 3 }
    ]);
};

const getHomePage = async (req, res) => {
    try {
        // Overall order statistics
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
        const topProducts = await getTopSellingProducts();
        const topCategories = await getTopSellingCategories();

        // Log overall results
        console.log(overall[0]?.totalGrandTotal); // Added optional chaining for safety
  console.log(topProducts,"and      ",topCategories);
        // Render the admin dashboard with all data
        res.render('admin/adminDashBoard', {
            title: 'admin_home',
            data: overall[0], // Accessing the first element since we are using $group
            activeUsers,
            topProducts,
            topCategories
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error'); // Send a server error response in case of failure
    }
};





const getAdminProducts= async (req,res)=>{
    try {
        const perPage = 8;
        const page = req.query.page || 1;
        const products = await productModel.aggregate([
            {
                $lookup:{
                    from:"categories",
                    localField:"category",
                    foreignField:"_id",
                    as:"categoryInfo"
                }
            },{$unwind:"$categoryInfo"}
        ])
        .skip((perPage * page) - perPage)
          .limit(perPage);
          const count= await productModel.countDocuments();

        // console.log(products);
     

        res.render('admin/adminProducts',{
            title:"products",
            data: products,
        adminName: req.session.adminName,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / perPage)
        });
        console.log(products);
    } catch (error) {
        console.log(error);
    }
   
}


const adminAdd_Products = async (req,res)=>{
    const catData = await categoryModel.find();

    res.render('admin/add-product',{
        title:'add_product',
        catData:catData
        
    })
}


const storage = multer.memoryStorage(); // Store images in memory for processing
const upload = multer({ storage: storage });

// Function to handle product addition
const postAddProduct = async (req, res) => {
    try {
        const data = req.body;

        // Basic validation
        if (!data.pname || !data.category || !data.quantity || !data.price) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Create a new product instance
        const newProduct = new productModel({
            pname: data.pname,
            category: new mongoose.Types.ObjectId(data.category), // Correctly create ObjectId
            quantity: parseInt(data.quantity, 10), // Ensure quantity is an integer
            description: data.description,
            price: parseFloat(data.price), // Ensure price is a float
            image: req.files.map(element => element.filename) // Assuming you have handled file uploads correctly
        });

        // Save the new product to the database
        const result = await newProduct.save(); // Save using the Mongoose model

        res.status(201).json({ message: "Product added successfully.", product: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding product." });
    }
};

// const postAddProduct = async (req, res) => {
//     try {
//         console.log('hii');
//         const data = req.body;
//         console.log(req.file);
//         const images = req.files.map(element => element.filename); // Simplified image array creation

//         // Basic validation
//         if (!data.pname || !data.category || !data.quantity || !data.price) {
//             return res.status(400).json({ message: "All fields are required." });
//         }

//         await productModel.collection.insertOne({
//             pname: data.pname,
//             category: new ObjectId(data.category),
//             quantity: parseInt(data.quantity, 10), // Ensure quantity is an integer
//             description: data.description,
//             price: parseFloat(data.price), // Ensure price is a float
//             image: images
//         });

//         res.status(201).json({ message: "Product added successfully." });
//     } catch (error) {
//         console.error(error);  
//         res.status(500).json({ message: "Error adding product." });
//     }
// };


const getCategory = async (req,res)=>{
    const data = await categoryModel.find()

    try {
        res.render('admin/adminCategory',{
            title:'Categories',
            data:data
        })
    } catch (error) {
     console.log(error.message);
    }
}
const addCategory = async (req,res)=>{
    const {data} = req.body;
    try {
        const categoryData = new categoryModel({
            cname:req.body.cname,
            cimage:req.file.filename
        })
        const data= await categoryData.save();
        if(data){
            const catData = await categoryModel.find();

            res.render('admin/adminCategory',{
            message:'category successfully added',
            data: catData,
            title:'categories'
          })  ;

        }else{
            res.render('admin/adminProducts',{
                message:'failed '
              })  ;  
        }
    } catch (error) {
        console.log(error.message);
    }
}
const getaddCategory = async (req,res)=>{
    try {

        res.render('admin/add-category',{
            title:'add-category',
        });
    } catch (error) {
        console.log(error.message);
    }
}
const adminDeleteProduct = async (req,res)=>{
    try {
        const productId = req.params.id; 
        console.log(productId);

        const deleteProduct = await productModel.deleteOne({ _id: productId });

        if (deleteProduct.deletedCount > 0) {
            res.redirect('/products');
        } else {
            res.status(404).send('Product not found');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}

const deleteCategory = async (req,res)=>{
    try {
        const categoryId = req.params.id; 
        console.log(categoryId);

        const deleteCategory = await categoryModel.deleteOne({ _id: categoryId });

        if (deleteCategory.deletedCount > 0) {
            res.redirect('/category');
        } else {
            res.status(404).send('category not found');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}


const adminGetUsers = async (req,res)=>{
    try {
        const perPage = 8;
        const page = req.query.page || 1;
        const users = await userModel.find()
        .skip((perPage * page) - perPage)
          .limit(perPage);
          const count= await userModel.countDocuments();

        res.render('admin/adminUsers',{
            title:'user_management',
            data: users,
        adminName: req.session.adminName,
        currentPage: parseInt(page),
          totalPages: Math.ceil(count / perPage)
        })
    } catch (error) {
        console.log(error.message);
    }
}
const adminGetAddUser = async (req,res)=>{
    try {
        res.render('admin/add-users',{
            title:'add_user'
        });
    } catch (error) {
      console.log(error);  
    }
}
const adminAddUser = async (req,res)=>{
    try {
        const users = new userModel({
            name:req.body.name,
            email:req.body.email,
            phone:req.body.phone,
            


        });
        const userData= await users.save();
        if(userData){
            const users = await userModel.find();

            res.render('admin/adminUsers',{
            message:'user successfully added',
            data: users,
            title:'users'
          })  ;

        }else{
            res.render('admin/adminUsers',{
                message:'failed '
              })  ;  
        }
        
    } catch (error) {
        console.log(error);
    }
}

const deleteUser = async (req,res)=>{
    try {
        const userId = req.params.id; 
        console.log(userId);

        const deleteUser = await userModel.deleteOne({ _id: userId });

        if (deleteUser.deletedCount > 0) {
            res.redirect('/users');
        } else {
            res.status(404).send('user not found');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
}

const updateCategory = async(req,res)=>{
    try {
        
        const catId= req.params.id;
        const data= req.body;
        await categoryModel.updateOne({_id:catId},{$set:{
            cname:data.cname,
            cimage:data.cimage
        }});
        console.log(data);
        res.redirect('/category');
    } catch (error) {
       console.log(error.message);   
    }
}

// const getEditUser = async (req,res)=>{
//     try {
//         const userId= req.params.id;
//     const userData= await userModel.findById({_id:userId});
//     console.log(userId);
//     if(!userData){
//         return res.status(404).send('category not found');

//     }
//     res.render('admin/edit-user',{
//         title:'edit_category',
//         userData:userData
//     });
//     } catch (error) {
//         console.log(error.message);
//     }
// }

// const updateUser = async (req,res)=>{
//     try {
        
//         const userId= req.params.id;
//         const userData= req.body;
//         await userModel.updateOne({_id:userId},{$set:{
//             name:userData.name,
//             email:userData.email,
//             phone:userData.phone
//         }});
//         console.log(userData);
//         res.redirect('/users');
//     } catch (error) {
//         console.log(error.message);
//     }
// }


const updateEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const data = req.body;
        
        // Array to hold the new images uploaded
        const images = [];

        // Collect new images from the request
        if (req.files && Array.isArray(req.files)) {
            req.files.forEach((element) => {
                images.push(element.filename);
            });
        }

        // Get the images marked for deletion from the body
        const deletedImages = Array.isArray(data.deletedImages) ? data.deletedImages : [data.deletedImages].filter(Boolean);

        // If there are images to delete, remove them from storage
        if (deletedImages.length > 0) {
            deletedImages.forEach((image) => {
                const imagePath = path.join(__dirname, 'path_to_your_image_directory', image); // Adjust this path as needed
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete image: ${image}`, err);
                    }
                });
            });
        }

        // Update product details in the database
        await productModel.updateOne({ _id: productId }, {
            $set: {
                pname: data.pname,
                price: data.price,
                quantity: data.quantity,
                description: data.description,
                category: data.category,
                image: images.length === 0 ? undefined : images, // Keep existing images if no new images uploaded
            }
        });

        // Redirect to products page
        res.redirect('/products');

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).send('Server Error');
    }
};


const searchUser =async (req,res)=>{
    try {
        
        const search=req.body.String;
        const data= await userModel.find({email:search});
        console.log(data);
        res.render("admin/searchUser",{
            data:data,
            title:'result'
        });

    } catch (error) {
        console.log(error.message);
    }

    

}

const searchProduct = async (req,res)=>{
    try {
        
        const search=req.body.String;
        const data= await productModel.find({pname:search});
        console.log(data);
        res.render("admin/searchProduct",{
            data:data,
            title:'result'
        });

    } catch (error) {
        console.log(error.message);
    }

    

}

const getEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
console.log(productId);
        // Fetch all categories for the select dropdown
        const catData = await categoryModel.find();

        // Fetch the product details by ID
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Ensure the product has an array for images
        if (!product.images) {
            product.images = []; // Initialize if not present
        }

        // Render the edit product page with product and category data
        res.render('admin/edit-product', {
            data: product,
            catData: catData,
            title: 'Edit Product'
        });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Server Error');
    }
}


const getEditCategory = async (req,res)=>{
   try {
    const catId=req.params.id;
    console.log(catId.length);  // Should print 24
console.log(catId);
    const catData= await categoryModel.findOne({_id:catId});
    
    if(!catData){
        return res.status(404).send('category not found');

    }
    res.render('admin/edit-category',{
        title:'edit_category',
        catData:catData
    })
   } catch (error) {
    console.log(error.message);
   }

}
const blockUser = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        const userData = await userModel.findByIdAndUpdate({ _id: id }, { $set: { is_active: false } })
        if (userData) {
            res.redirect('/users')
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
}



const unblockUser =async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        const userData = await userModel.findByIdAndUpdate({ _id: id }, { $set: { is_active: true } })
        if (userData) {
            res.redirect('/users')
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
}

const viewOrders = async (req,res)=>{
try {
    // const orders = await orderModel.find();
    const orders = await orderModel.aggregate([
        {
          $lookup: {
            from: "users",
            let: { userId: { $toObjectId: "$userId" } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$userId"] },
                },
              },
            ],
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $lookup: {
            from: "addresses",
            localField: "deliveryAddress",
            foreignField: "_id",
            as: "address",
          },
        },
        { $unwind: "$address" },
      ]);
      let productCount = 0;

      orders.reduce((total, current) => {
        productCount = current.productsDetails.reduce(
          (subtotal, subcurrent) => {
            return (subtotal += subcurrent.quantity);
          },
          0
        );
        return 0;
      }, 0);

      orders.productCount = productCount;
      
      res.render("admin/orders", {
        title: "Admin Orders",
        orders: orders ? orders : false,
        adminName: req.session.adminName,
      });
    // res.render('admin/orders',{
    //     orders:orders,
    //     title:'Orders'
    // })
    console.log(orders);
} catch (error) {
    console.log(error.message);
}
}



const getAdminOrderDetailpage = async (req, res, next) => {
    try {
      // Fetch the order using its ID
      const orderId = new ObjectId(req.params.id);
      console.log('Fetching order:', orderId);
  
      // Fetch the order details
      const order = await orderModel.findById(orderId).populate('deliveryAddress');
  
      if (!order) {
        throw new Error('Order not found');
      }
  
      // Fetch the products details
      const productsDetails = await productModel.find({
        _id: { $in: order.productsDetails.map(product => product.productId) }
      });
  
      // Prepare the response object
      const orderDetails = {
        orderId: order._id,
        userId: order.userId,
        deliveryAddress: order.deliveryAddress,
        products: order.productsDetails.map(product => {
          const productDetail = productsDetails.find(p => p._id.toString() === product.productId.toString());
          return {
            productId: product.productId,
            quantity: product.quantity,
            pname: productDetail ? productDetail.pname : 'Unknown',
            price: productDetail ? productDetail.price : 0,
          };
        }),
        paymentDetails: {
          method: order.paymentDetails ? order.paymentDetails.method : 'N/A',
          orderId: order.paymentDetails ? order.paymentDetails.orderId : null,
          paymentId: order.paymentDetails ? order.paymentDetails.paymentId : null,
        },
        grandTotal: order.grandTotal,
        orderStatus: order.orderStatus,
        placedAt: order.placedAt,
      };
  
      // Check if cancellation was requested and add the reason to orderDetails
      if (order.cancelRequested) {
        orderDetails.cancellationReason = order.cancellationReason || 'No reason provided';
      }
  
      // If no order is found, handle it
      if (orderDetails.length === 0) {
        return res.status(404).send('Order not found');
      }
  
      console.log('Order details:', orderDetails);
      // Pass the retrieved details to the EJS template
      req.session.orderId = orderId;
      res.render("admin/orderDetailes", {
        title: "Order Details",
        orderId,
        order: orderDetails, // Pass the entire order details
      });
    } catch (error) {
      console.error('Error fetching order details:', error.message);
      next(error); // Pass the error to the next middleware or error handler
    }
  };
  


  const getAdminCouponPage= async (req, res,next) => {
    try {
      const coupons = await couponModel.find({ isDeleted: false });
      const category = await categoryModel.find();
      res.render("admin/adminCoupon", {
        title: "Admin Coupon",
        adminName: req.session.adminName,
        coupons,
        category,
        // success: req.session.success ? true : false,
      });
      delete req.session.success;
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

const  doAddCoupon = async (req, res,next) => {
    try {
      const databody = req.body;
      console.log("checking",databody);
    //   if (!Array.isArray(databody.categoryId)) {
    //     databody.categoryId = [databody.categoryId];
    //   }
    //   const catId = databody.categoryId.map((item) => {
    //     return new ObjectId(item);
    //   });
  const catId=new ObjectId(databody.category);
      await couponModel.collection.insertOne({
        // code: databody.code.toLowerCase(),
        code:databody.code,
        value: Number(databody.value),
        expiresAt: new Date(databody.expireAt),
        min_purchase: databody.min_purchase,
        isDeleted: false,
      });

      req.session.success = true;
      res.redirect("/adminCoupon");
    } catch (error) {
      console.log(error);
      next(error)
    }
  }
  const deleteCoupon = async (req, res,next) => {
    try {
      const couponId = req.params.id;
      console.log(couponId);
      await couponModel.updateOne(
        { _id: couponId },
        {
          isDeleted: true,
        }
      );
      res.redirect("/adminCoupon");
    } catch (error) {
      console.log(error);
      next(error)
    }
  }

const getEditCoupon = async (req, res) => {
    try {
        console.log(req.params.id);
        const coupon = await couponModel.findById(req.params.id); // Find coupon by ID
        const categories = await categoryModel.find(); // Fetch categories if needed
        res.render('admin/editCoupon', { coupon, categories }); // Render the edit form with the coupon data
    } catch (err) {
        console.log(error.message);
    }
}

// Route to update the coupon in the database
const postEditCoupon= async (req, res) => {
    try {
        const coupon = await couponModel.findByIdAndUpdate(req.params.id, {
            code: req.body.code,
            value: req.body.value,
            expiresAt: req.body.expiresAt,
            min_purchase: req.body.min_purchase,
        }, { new: true });
        res.redirect('/adminCoupon'); // Redirect to the coupon list after editing
    } catch (err) {
        res.status(500).send("Error updating coupon");
    }
}

const addCatOffer = async (req,res)=>{
    const { id } = req.params;
    const { offerValue } = req.body;

    console.log('Received offer value for category ID:', id, 'with offer value:', offerValue); // Debugging

    try {
        if (!offerValue || offerValue < 0 || offerValue > 100) {
            return res.status(400).json({ success: false, message: 'Invalid offer value.' });
        }

        const updatedCategory = await categoryModel.findByIdAndUpdate(
            id,
            { categoryOffer: offerValue }, // Assuming categoryOffer is the field for storing offer value
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found.' });
        }

        console.log('Updated Category:', updatedCategory); // Debugging
        res.json({ success: true, message: 'Offer added successfully.' });
    } catch (err) {
        console.error('Server Error:', err); // Debugging
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}


const removeCatOffer = async (req,res)=>{
   
        const categoryId =new ObjectId(req.params.id);

        try {
           
            const updatedCategory = await categoryModel.findByIdAndUpdate(
                categoryId,
                { categoryOffer: 0 },
                { new: true } // Return the updated document
            );
    
            if (!updatedCategory) {
                return res.status(404).json({ success: false, message: 'Category not found' });
            }
    
            console.log("Offer removed successfully for category ID:", categoryId);
            return res.json({ success: true, message: 'Offer removed successfully', updatedCategory });
        } catch (error) {
            console.error("Error removing offer:", error);
            return res.status(500).json({ success: false, message: 'Error removing offer' });
        }
    
}

const changeOrderStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;
        console.log(req.body);

        // Find the order by ID
        const order = await orderModel.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update the order status
        await orderModel.updateOne({ _id: orderId }, { $set: { orderStatus: newStatus, isCanceled: true } });

        // If the order is cancelled, increment the quantity of the products
        if (newStatus === 'cancelled') {
            // Loop through each product in the order and update the product quantities
            for (const item of order.productsDetails) {
                const productId = item.productId; // Assuming each item has a productId field
                const quantityToAdd = item.quantity; // Get the quantity to add back

                // Update the product's quantity in the product model
                await productModel.updateOne(
                    { _id: productId },
                    { $inc: { quantity: quantityToAdd } } // Increment the quantity
                );
            }

            // Logic to update wallet can go here if needed
            // await updateWallet(order.userId, order.grandTotal);
        }

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const updateRefund = async (req, res) => {
    try {
        const { orderId } = req.body;

        // Find the order and get the amount to be refunded
        const order = await orderModel.findById(orderId); // No need for ObjectId wrapper
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
         if(order.paymentDetails.method ==='razorpay' ||order.paymentDetails.method ==="wallet"){

         
        const amountToRefund = order.grandTotal; // Assuming grandTotal is the amount to refund
        // Find the wallet by userId
        const existUser = await walletModel.findOne({ userId: order.userId });
         
        if (!existUser) {
            // If no wallet exists for the user, create a new wallet
            await walletModel.create({
                userId: order.userId,
                balance: amountToRefund, // Initial balance is the refund amount
                transactionDetails: [{
                    orderId:order.paymentDetails.orderId,
                    paymentType: 'Credit',
                    date: new Date(),
                    amount: amountToRefund
                }],
            });
        } else {
            // If wallet exists, update the balance and add to transactionDetails array
            await walletModel.updateOne(
                { userId: order.userId },
                {
                    $inc: { balance: amountToRefund }, // Increment balance by refund amount
                    $push: {
                        transactionDetails: {
                            orderId:order.paymentDetails.orderId,

                            paymentType: 'credit',
                            date: new Date(),
                            amount: amountToRefund
                        }
                    }
                }
            );
        }

        res.json({ success: true, message: 'Wallet updated successfully' });
    }
    } catch (error) {
        console.error('Error updating wallet:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getDashboardData = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;

        let query = {   orderStatus: { $nin: ['cancelled', 'payment pending'] } }; // Only include confirmed orders
        const today = new Date();
        let datePeriod = ""; // Variable to store the date period
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0'); // Ensure two-digit day
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const year = date.getFullYear();
            return `${day}-${month}-${year}`; // Return formatted date
        };
        
        if (reportType === 'daily') {
            const start = new Date();
            start.setUTCHours(0, 0, 0, 0); // Start of the day in UTC
            const end = new Date();
            end.setUTCHours(23, 59, 59, 999); // End of the day in UTC
        
            query.placedAt = { $gte: start, $lte: end };
            datePeriod = `Date: ${formatDate(start)}`; // Use formatted date
        } else if (reportType === 'weekly') {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay()); // Sunday of the current week
            start.setHours(0, 0, 0, 0);
        
            const end = new Date(start);
            end.setDate(start.getDate() + 6); // Saturday of the current week
            end.setHours(23, 59, 59, 999);
        
            query.placedAt = { $gte: start, $lte: end };
            datePeriod = `Week: ${formatDate(start)} - ${formatDate(end)}`; // Use formatted dates
        } else if (reportType === 'monthly') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            query.placedAt = { $gte: start, $lte: end };
            datePeriod = `Month: ${formatDate(start)} - ${formatDate(end)}`; // Use formatted dates
        } else if (reportType === 'yearly') {
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear() + 1, 0, 0);
            query.placedAt = { $gte: start, $lte: end };
            datePeriod = `Year: ${start.getFullYear()}`; // Year remains the same
        } else if (reportType === 'custom' && startDate && endDate) {
            query.placedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
            datePeriod = `Custom Range: ${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`; // Use formatted dates
        }
        

        // Count total orders matching the query
        const totalOrders = await orderModel.countDocuments(query);
        console.log('Total Orders:', totalOrders);

        // Aggregate total sales for the sales graph based on reportType
        let groupByFormat;
        switch (reportType) {
            case 'daily':
                groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } }; // Group by day
                break;
            case 'weekly':
                groupByFormat = { $isoWeek: "$placedAt" }; // Group by ISO week
                break;
            case 'monthly':
                groupByFormat = { $dateToString: { format: "%Y-%m", date: "$placedAt" } }; // Group by month
                break;
            case 'yearly':
                groupByFormat = { $dateToString: { format: "%Y", date: "$placedAt" } }; // Group by year
                break;
            default:
                groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } }; // Default to daily
                break;
        }

        const salesData = await orderModel.aggregate([
            { $match: query }, // Match the orders based on the selected date range and status
            {
                $group: {
                    _id: groupByFormat, // Group by the selected time format (day, week, month, year)
                    totalSales: { $sum: { $toDouble: "$grandTotal" } }, // Sum the grandTotal for each period
                    totalOrders: { $sum: 1 } // Count the number of orders for each period
                }
            },
            { $sort: { _id: 1 } } // Sort by the date in ascending order
        ]);

        // Aggregate total sales and discount for overall metrics
        const totalSalesMetrics = await orderModel.aggregate([
            {
                $match: { orderStatus: { $nin: ['cancelled', 'payment pending'] } }
            },
            {
                $group: {
                    _id: null,
                    totalGrandTotal: { $sum: { $toDouble: "$grandTotal" } },
                    totalDiscount: { $sum: { $toDouble: "$couponDiscount" } },
                    totalOfferAmount: { $sum: { $toDouble: "$offerDiscount" } } // Sum of offerDiscount
                }
            }
        ]);

        // Access the total metrics
        const { totalGrandTotal, totalDiscount, totalOfferAmount } = totalSalesMetrics[0] || { totalGrandTotal: 0, totalDiscount: 0, totalOfferAmount: 0 };
 
        
          
        // Get active users dynamically from user model
        const activeUsers = await userModel.countDocuments({ is_active: true });

        // Format the sales data for the graph
        const formattedSalesData = salesData.map(item => ({
            label: item._id, // The date (daily, weekly, monthly, etc.)
            totalSales: item.totalSales // Total sales for that period
        }));

        // Send the response back to the client with all required data
        res.json({
            totalGrandTotal,
            totalOrders,
            totalDiscount,
            totalOfferAmount, // Include total offer amount in the response
            activeUsers,
            salesData: formattedSalesData,
            datePeriod , 
            
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}




// controllers/dashboardController.js


const getSalesData = async (reportType, startDate, endDate) => {
    let query = { orderStatus: { $ne: 'cancelled' } }; // Only include confirmed orders

    // Handle different report types
    if (reportType === 'daily') {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0); // Start of the day in UTC
        const end = new Date();
        end.setUTCHours(23, 59, 59, 999); // End of the day in UTC

        query.placedAt = { $gte: start, $lte: end };
    } else if (reportType === 'weekly') {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Start of the week
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6); // End of the week
        end.setHours(23, 59, 59, 999);

        query.placedAt = { $gte: start, $lte: end };
    } else if (reportType === 'monthly') {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        query.placedAt = { $gte: start, $lte: end };
    } else if (reportType === 'yearly') {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear() + 1, 0, 0);
        query.placedAt = { $gte: start, $lte: end };
    } else if (reportType === 'custom' && startDate && endDate) {
        query.placedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Fetch sales data from the database
    const salesData = await orderModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
                totalSales: { $sum: { $toDouble: "$grandTotal" } }
            }
        },
        { $sort: { _id: 1 } } // Sort by date in ascending order
    ]);

    return salesData;
};

const addProductOffer = async (req,res)=>{
    const {id} = req.params;
    const { offerValue } = req.body;

    console.log('Received offer value for product ID:', id, 'with offer value:', offerValue); 

    try {
        if (!offerValue || offerValue < 0 || offerValue > 100) {
            return res.status(400).json({ success: false, message: 'Invalid offer value.' });
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            id,
            { productOffer: offerValue }, // Assuming categoryOffer is the field for storing offer value
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'product not found.' });
        }

        console.log('Updated product:', updatedProduct);
        res.json({ success: true, message: 'Offer added successfully.' });
    } catch (err) {
        console.error('Server Error:', err); // Debugging
        res.status(500).json({ success: false, message: 'Server error.' });
    }
}

const removeProductOffer = async (req,res)=>{
  
    const productId =(req.params.id);

    try {
       
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { productOffer: 0 },
            { new: true } 
        );

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'product not found' });
        }

        console.log("Offer removed successfully for product ID:", productId);
        return res.json({ success: true, message: 'Offer removed successfully', updatedProduct });
    } catch (error) {
        console.error("Error removing offer:", error);
        return res.status(500).json({ success: false, message: 'Error removing offer' });
    }
}

const getDownloadPdf = async (req, res) => {
    const { reportType, startDate, endDate } = req.query;

    try {
        // Fetch the sales data from your database based on the report type
        const salesData = await getSalesData(reportType, startDate, endDate);
        
        // Fetch the overall metrics
        const totalMetrics = await getTotalMetrics(reportType, startDate, endDate);

        // Create a new PDF document
        const doc = new PDFDocument();
        let filename = `Sales_Report_${Date.now()}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res); // Stream PDF to response

        // Title
        doc.fontSize(30).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);

        // Overall Metrics
        doc.fontSize(18).font('Helvetica-Bold').text('Overall Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(16).font('Helvetica').text(`Total Sales: ₹${totalMetrics.totalGrandTotal.toFixed(2)}`);
        doc.text(`Total Orders: ${totalMetrics.totalOrders}`);
        doc.text(`Total Discount: ₹${totalMetrics.totalDiscount.toFixed(2)}`);
        doc.moveDown(1);

        // Sales Data Header
        doc.fontSize(18).font('Helvetica-Bold').text('Sales Data', { underline: true });
        doc.moveDown(0.5);

        // Table Header
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Date', { width: 200, align: 'left' });
        doc.text('Total Sales', { width: 200, align: 'right' });
        doc.moveDown(0.5);

        // Add a separator line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Sales Data
        doc.fontSize(14).font('Helvetica');
        salesData.forEach(data => {
            doc.text(data._id, { width: 200, align: 'left' });
            doc.text(`₹${data.totalSales.toFixed(2)}`, { width: 200, align: 'right' });
            doc.moveDown(0.5);
        });

        // Finalize the PDF
        doc.end(); // Finalize the PDF
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF report' });
    }
};


// Implement a new function to get total metrics
const getTotalMetrics = async (reportType, startDate, endDate) => {
    let query = { orderStatus: { $ne: 'cancelled' } }; // Only include confirmed orders

    // Modify the query for custom date range if provided
    if (reportType === 'custom' && startDate && endDate) {
        query.placedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const totalSalesMetrics = await orderModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalGrandTotal: { $sum: { $toDouble: "$grandTotal" } },
                totalDiscount: { $sum: { $toDouble: "$couponDiscount" } },
                totalOrders: { $sum: 1 } // Count total orders
            }
        }
    ]);

    return totalSalesMetrics[0] || { totalGrandTotal: 0, totalDiscount: 0, totalOrders: 0 };
};

const downloadExcel = async (req, res) => {
    const { reportType, startDate, endDate } = req.query;

    try {
        // Fetch the sales data and overall metrics from your database
        const salesData = await getSalesData(reportType, startDate, endDate); // Implement this function
        const { totalOrders, totalDiscount, totalSales } = await getTotalMetrics(reportType, startDate, endDate); // Implement this function

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Prepare summary data
        const summaryData = [
            { Metric: "Total Sales", Value: totalSales },
            { Metric: "Total Orders", Value: totalOrders },
            { Metric: "Total Discount", Value: totalDiscount }
        ];

        // Create a worksheet for summary data and add it to the workbook
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Create a worksheet for detailed sales data
        const salesSheet = XLSX.utils.json_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Data');

        // Generate Excel file as a buffer
        const buffer = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'buffer'
        });

        // Set headers to prompt a file download
        const filename = `Sales_Report_${Date.now()}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the buffer as the response
        res.send(buffer);
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ message: 'Error generating Excel report' });
    }
};


module.exports ={
    getDashboardData,
    getAdminProducts,
    adminAdd_Products,
    adminGetUsers,
    adminGetAddUser,
    adminAddUser,
    postAddProduct,
    adminDeleteProduct,
    // loadEditProduct,
    addCategory,
    getCategory,
    getaddCategory,
    getEditProduct,
    updateEditProduct,
    deleteCategory,
    deleteUser,
    searchProduct,
    updateCategory,
    getEditCategory,
    // getEditUser,
    // updateUser,
    doAddCoupon,
    deleteCoupon,
    postEditCoupon,
    getEditCoupon,
    getAdminCouponPage,
    searchUser,
    blockUser,
    unblockUser,
    getHomePage,
    viewOrders,
    getAdminOrderDetailpage,
    changeOrderStatus,
    updateRefund,
    getDownloadPdf,
    downloadExcel,
    addCatOffer,
    removeCatOffer,
    addProductOffer,
    removeProductOffer,

}




















