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
const addressModel = require("../models/addressModel");
const moment = require("moment");

const formatDate = (date) => {
    if (!date) return '';
    return moment(date).format('MMMM Do YYYY'); 
};





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
                from: 'products', 
                localField: '_id', 
                foreignField: '_id',
                as: 'productDetails' 
            }
        },
        { $unwind: '$productDetails' }, 
        {
            $project: {
                productId: '$_id', 
                productDetails: 1, 
                totalQuantity: 1 
            }
        },
        { $sort: { totalQuantity: -1 } }, 
        { $limit: 10 } 
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

        { $sort: { totalQuantity: -1 } },

        { $limit: 4 }
    ]);
};

const getHomePage = async (req, res) => {
    try {
        // Overall order statistics
        const overall = await orderModel.aggregate([
            {
                $unwind: "$productsDetails" // Unwind productsDetails to handle individual products
            },
            {
                $match: {
                    "productsDetails.productOrderStatus": { $nin: ['Cancelled', 'payment pending'] }, // Exclude products with 'Cancelled' or 'payment pending' status
                }
            },
            {
                $group: {
                    _id: null,
                    
                    // Safely sum the offerPrice field, ensuring conversion from strings or null
                    totalGrandTotal: { $sum: { $toDouble: { $ifNull: ["$productsDetails.offerPrice", 0] } } }, 
                    
                    // Safely sum the couponDiscount field, ensuring conversion from strings or null
                    totalOfferDiscount: { $sum: { $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } } }, 
        
                    // Sum applied offers, checking if the field is an array or a number
                    totalAppliedOffers: {
                        $sum: {
                            $cond: {
                                if: { $isArray: "$productsDetails.appliedOffer" }, // Check if it's an array
                                then: {
                                    $reduce: {
                                        input: "$productsDetails.appliedOffer", // Process as array
                                        initialValue: 0,
                                        in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this", 0] } }] }
                                    }
                                },
                                else: { $toDouble: { $ifNull: ["$productsDetails.appliedOffer", 0] } } // Process as a single number
                            }
                        }
                    },
        
                    totalOrders: { $sum: 1 } // Total count of non-cancelled orders
                }
            }
        ]);
        
        
        
console.log('overall',overall);
        const activeUsers = await userModel.countDocuments({ is_active: true });

        const topProducts = await getTopSellingProducts();
        const topCategories = await getTopSellingCategories();

        const categorySales = await categoryData(); // Reuse the categoryData function
        const paymentMethods = await paymentData(); // Reuse the paymentData function
        console.log(categorySales, "     and      ", paymentMethods);

        const categoryLabels = categorySales.map(category => category.cname);
       
        const orders = await orderModel.aggregate([

            {
                $lookup: {
                    from: "users", // Replace with your actual user collection name
                    localField: "userId", // The field in orderModel that holds the user ID
                    foreignField: "_id", // The field in users collection that corresponds to the user ID
                    as: "userInfo" // Resulting array field
                }
            },
            {
                $unwind: "$userInfo" // Unwind the user info to get individual user details
            },
            {
                $unwind: "$productsDetails" // Unwind productsDetails to process each product separately
            },
            {
                $lookup: {
                    from: "products", // Replace with your actual product collection name
                    localField: "productsDetails.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $unwind: "$productInfo" // Unwind product info to get individual product details
            },
            {
                $lookup: {
                    from: "addresses", // Replace with your actual address collection name
                    localField: "deliveryAddress", // The field in orderModel that holds the address ID
                    foreignField: "_id", // The field in addresses collection that corresponds to the address ID
                    as: "addressInfo"
                }
            },
            {
                $unwind: "$addressInfo" // Unwind address info to get individual address details
            },
            {
                $project: {
                    order_id: "$_id",
                    user_id: "$userId", // Include user ID
                    user_name: "$userInfo.name", // Assuming 'name' is a field in the user model
                    product_name: "$productInfo.pname", 
                    image:"$productInfo.image",
                    productDescription:"$productInfo.description",
                    quantity: "$productsDetails.quantity",
                    price:"$productsDetails.price",
                    appliedOffer:"$productsDetails.appliedOffer",
                    offerPrice:"$productsDetails.offerPrice",
                    couponDiscount:"$productsDetails.couponDiscount",
                    productStatus: "$productsDetails.productOrderStatus",
                    grandTotal: "$grandTotal", 
                    total: "$paymentDetails.grandTotal", 
                    shippingAddress: "$addressInfo", // Include address information here
                    paymentMethod: "$paymentDetails.method", 
                    orderId:"$paymentDetails.orderId"
                }
            },
            {
                $sort: { placedAt: -1 } // Sort orders by placement date
            }
        ]).exec();
        
        
        console.log("my orders", orders);
        
        // Now, pass categoryLabels to the view as well
        res.render('admin/adminDashBoard', {
            title: 'admin_home',
            data: overall[0],
            activeUsers,
            topProducts,
            orders,
            topCategories,
            categorySales,
            paymentMethods, // Passing payment methods data to the view
            categoryLabels // Pass category labels to the view
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};


const categoryData = async () => {
    try {
        const categorySales = await orderModel.aggregate([
            { $unwind: '$productsDetails' }, // Unwind productsDetails array
            {
                $lookup: {
                    from: 'products', // The name of the product collection
                    localField: 'productsDetails.productId', // productId in productsDetails
                    foreignField: '_id', // Match with product _id
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' }, // Unwind the productInfo array
            {
                $lookup: {
                    from: 'categories', // The name of the category collection
                    localField: 'productInfo.category', // category field in product model
                    foreignField: '_id', // Match with the category _id
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' }, // Unwind the categoryInfo array
            {
                $group: {
                    _id: '$categoryInfo.cname', // Group by category name
                    totalSales: { $sum: '$grandTotal' } // Sum the grandTotal for each category
                }
            },
            {
                $project: {
                    cname: '$_id', 
                    totalSales: 1,
                    _id: 0 
                }
            }
        ]);
        
        return categorySales; // Return the resulting category sales data
    } catch (error) {
        console.error('Error fetching category sales data:', error);
        throw error; // Pass the error up
    }
};

const paymentData = async () => {
    try {
        const paymentMethods = await orderModel.aggregate([
            {
                $group: {
                    _id: '$paymentDetails.method',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    method: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ]);
        return paymentMethods;
    } catch (error) {
        console.error('Error fetching payment methods data:', error);
        throw error; // Pass the error up
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




const postAddProduct = async (req, res) => {
    try {
        const data = req.body;

        if (!data.pname || !data.category || !data.quantity || !data.price || !data.brand) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const newProduct = new productModel({
            pname: data.pname,
            brand:data.brand,
            category: new mongoose.Types.ObjectId(data.category), 
            quantity: parseInt(data.quantity, 10), 
            description: data.description,
            price: parseFloat(data.price), 
            image: req.files.map(element => element.filename) 
        });

        const result = await newProduct.save();

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


// const addCategory = async (req,res)=>{
//     const {data} = req.body;
//     try {
//         const categoryData = new categoryModel({
//             cname:req.body.cname,
//             cimage:req.file.filename
//         })
//         const data= await categoryData.save();
//         if(data){
//             const catData = await categoryModel.find();

//             res.render('admin/adminCategory',{
//             message:'category successfully added',
//             data: catData,
//             title:'categories'
//           })  ;

//         }else{
//             res.render('admin/adminProducts',{
//                 message:'failed '
//               })  ;  
//         }
//     } catch (error) {
//         console.log(error.message);
//     }
// }


const addCategory = async (req, res) => {
    const { cname } = req.body; // Only use category name from request body
    try {
        // Check if the category already exists (case insensitive)
        const existingCategory = await categoryModel.findOne({ cname: { $regex: new RegExp(`^${cname}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category already exists." });
        }

        // Create new category if it doesn't exist
        const categoryData = new categoryModel({ cname });
        const data = await categoryData.save();

        if (data) {
            const catData = await categoryModel.find();
            res.json({ success: true, message: 'Category successfully added', data: catData });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add category' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


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
        const catData = await categoryModel.find();

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        if (!product.images) {
            product.images = []; 
        }

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



const getEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { cname } = req.body;

        // Check if the category exists
        const category = await categoryModel.findById(categoryId);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Update the category name
        category.cname = cname;
        const updatedCategory = await category.save();

        // Return success response
        res.json({ success: true, message: 'Category updated successfully' });
        
    } catch (error) {
        console.error('Error updating category:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
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
                from: "users", // Replace with your actual user collection name
                localField: "userId", // The field in orderModel that holds the user ID
                foreignField: "_id", // The field in users collection that corresponds to the user ID
                as: "userInfo" // Resulting array field
            }
        },
        {
            $unwind: "$userInfo" // Unwind the user info to get individual user details
        },
        {
            $unwind: "$productsDetails" // Unwind productsDetails to process each product separately
        },
        {
            $lookup: {
                from: "products", // Replace with your actual product collection name
                localField: "productsDetails.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        {
            $unwind: "$productInfo" // Unwind product info to get individual product details
        },
        {
            $lookup: {
                from: "addresses", // Replace with your actual address collection name
                localField: "deliveryAddress", // The field in orderModel that holds the address ID
                foreignField: "_id", // The field in addresses collection that corresponds to the address ID
                as: "addressInfo"
            }
        },
        {
            $unwind: "$addressInfo" // Unwind address info to get individual address details
        },
        {
            $project: {
                order_id: "$_id",
                user_id: "$userId", // Include user ID
                user_name: "$userInfo.name", // Assuming 'name' is a field in the user model
                user_phone:"$userInfo.phone",
                productId:"$productsDetails.productId",
                product_name: "$productInfo.pname", 
                image:"$productInfo.image",
                productDescription:"$productInfo.description",
                quantity: "$productsDetails.quantity",
                price:"$productsDetails.price",
                appliedOffer:"$productsDetails.appliedOffer",
                offerPrice:"$productsDetails.offerPrice",
                couponDiscount:"$productsDetails.couponDiscount",
                productStatus: "$productsDetails.productOrderStatus",
                grandTotal: "$grandTotal", 
                placedAt:"$placedAt",
                total: "$paymentDetails.grandTotal", 
                shippingAddress: "$addressInfo", // Include address information here
                paymentMethod: "$paymentDetails.method", 
                orderId:"$paymentDetails.orderId"
            }
        },
        {
            $sort: { placedAt: -1 } // Sort orders by placement date
        }
    ]).exec();
    
    // console.log(orders,"checking the data");

      // Now `orders` will contain the relevant information
      let totalProductCount = 0; // Initialize a variable to hold the total product count

      // Iterate through the orders and accumulate the product quantities
      orders.forEach(order => {
          // Check if productsDetails exists and is an array
          if (Array.isArray(order.productsDetails)) {
              // Add the quantities of products in the current order
              const productCount = order.productsDetails.reduce((subtotal, product) => {
                  return subtotal + product.quantity; // Sum up the quantity of each product
              }, 0);
      
              totalProductCount += productCount; // Add to the total count
          }
      });
      const orderDetails = await orderModel.find({}).populate('userId', 'name phone'); // Populate userId with name and phone

    //   const transformedOrders = orders.flatMap(order => {
    //       // Check if productsDetails is an array
    //       if (Array.isArray(order.productsDetails)) {
    //           return order.productsDetails.map(product => {
    //               return {
    //                   order_id: order._id, // Common Order ID
    //                   paymentMethod: order.paymentDetails.method, // Payment method
    //                   paymentOrderId: order.paymentDetails.orderId, // Payment Order ID
    //                   placedAt: order.placedAt, // Order placed date
    //                   couponCode: order.paymentDetails.couponCode, // Coupon code
    //                   deliveryAddress: order.deliveryAddress, // Delivery Address
    //                   userName: order.userId.name, // User's Name from populated data
    //                   userPhone: order.userId.phone, // User's Phone from populated data
    //                   productId: product.productId, // Product ID
    //                   quantity: product.quantity, // Quantity
    //                   price: product.price, // Original Price
    //                   offerPrice: product.offerPrice, // Offer Price
    //                   appliedOffer: product.appliedOffer, // Applied Offer
    //                   couponDiscount: product.couponDiscount, // Coupon Discount
    //                   productOrderStatus: product.productOrderStatus, // Product Order Status
    //                   cancellationReason: product.cancellationReason, // Cancellation Reason
    //                   isCanceled: product.isCanceled, // Is Canceled
    //                   refundAmount: product.refundAmount // Refund Amount
    //               };
    //           });
    //       } else {
    //           console.warn(`productsDetails is not an array for order ID: ${order._id}`, order.productsDetails);
    //           return []; // Return an empty array if productsDetails is not an array
    //       }
    //   });
      
      // Now transformedOrders contains all the required details
      
    // Now `transformedOrders` can be used to render in your template
    
    
    // Now `transformedOrders` can be used to render in your template
console.log(orders,"this is transformed orders");    



    //   console.log(orders,"view orders");
      res.render("admin/orders", {
        title: "Admin Orders",
        orders: orders ? orders : false,
        adminName: req.session.adminName,
      });
    // res.render('admin/orders',{
    //     orders:orders,
    //     title:'Orders'
    // })
} catch (error) {
    console.log(error.message);
}
}

const getAdminOrderDetailpage = async (req, res, next) => {
    try {
        console.log(req.query);
        const { orderId, productId } = req.query;
        console.log('Fetching order:', orderId);
     
        const order = await orderModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(orderId), // Match the order ID
                    'productsDetails.productId': new mongoose.Types.ObjectId(productId) // Ensure it contains the product ID in productsDetails
                }
            },
            {
                $lookup: {
                    from: 'addresses', // Lookup to get the address details
                    localField: 'deliveryAddress',
                    foreignField: '_id',
                    as: 'addressData'
                }
            },
            {
                $lookup: {
                    from: 'users', // Lookup to get user details
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $lookup: {
                    from: 'products', // Lookup to get product details
                    localField: 'productsDetails.productId', // Field from order model
                    foreignField: '_id', // Field from product model
                    as: 'productData'
                }
            },
            {
                $unwind: '$addressData' // Unwind the address data
            },
            {
                $unwind: '$userData' // Unwind the user data
            },
            {
                $unwind: {
                    path: '$productData', // Unwind the product data
                    preserveNullAndEmptyArrays: true // Optional: Include orders with no matching products
                }
            },
            {
                $project: {
                    _id: 1,
                    paymentDetails: 1,
                    placedAt: 1,
                    grandTotal: 1,
                    addressData: 1,
                    userData: {
                        name: '$userData.name',
                        phone: '$userData.phone',
                        email: '$userData.email',
                    },
                    productsDetails: {
                        $filter: {
                            input: '$productsDetails',
                            as: 'product',
                            cond: { $eq: ['$$product.productId', new mongoose.Types.ObjectId(productId)] } // Condition to match productId
                        }
                    },
                    productInfo: {
                        pname: '$productData.pname', // Product name
                        image: '$productData.image', // Product image
                        description: '$productData.description', // Product description
                        brand: '$productData.brand' // Product brand
                    }
                }
            },
            {
                $addFields: {
                    productsDetails: {
                        $map: {
                            input: '$productsDetails',
                            as: 'pd',
                            in: {
                                price: '$$pd.price',
                                offerPrice: '$$pd.offerPrice',
                                appliedOffer: '$$pd.appliedOffer',
                                couponDiscount: '$$pd.couponDiscount',
                                productOrderStatus: '$$pd.productOrderStatus',
                                refundAmount: { $ifNull: ['$$pd.refundAmount', 0] }, // Use 0 if refundAmount is null
                                quantity: '$$pd.quantity',
                                cancellationReason: { $ifNull: ['$$pd.cancellationReason', 'N/A'] }, // Use N/A if cancellationReason is null
                                returnReason: { $ifNull: ['$$pd.returnReason', 'N/A'] } // Use N/A if returnReason is null
                            }
                        }
                    }
                }
            }
        ]);

        // console.log("Order:", order);

        if (!order || order.length === 0) {
            throw new Error('Order not found');
        }

        const user = await userModel.findById(order[0].userId); // Use order[0].userId to find user
        const addressDetails = await addressModel.findById(order[0].deliveryAddress); // Use order[0].deliveryAddress

        const orderDetail = order[0]; // Get the first element from the array

        // Prepare the response object
        const orderDetails = {
            orderId: orderDetail._id,
            userId: orderDetail.userId,
            deliveryAddress: orderDetail.addressData || null,
            userData: { // Include user data
                name: orderDetail.userData.name || 'Anonymous',
                email: orderDetail.userData.email || 'No email provided',
                phone: orderDetail.userData.phone || 'No phone provided',
            },
            products: orderDetail.productsDetails.map(product => {
                return {
                    productId: productId,
                    quantity: product.quantity,
                    price: product.price,
                    offerPrice: product.offerPrice,
                    appliedOffer: product.appliedOffer,
                    couponDiscount: product.couponDiscount,
                    orderStatus: product.productOrderStatus,
                    pname: orderDetail.productInfo.pname || 'Unknown',
                    image: orderDetail.productInfo.image || 'no-image.jpg',
                };
            }),
            paymentDetails: {
                method: orderDetail.paymentDetails ? orderDetail.paymentDetails.method : 'N/A',
                orderId: orderDetail.paymentDetails ? orderDetail.paymentDetails.orderId : null,
                paymentId: orderDetail.paymentDetails ? orderDetail.paymentDetails.paymentId : null,
            },
            grandTotal: orderDetail.grandTotal,
            couponDiscount: orderDetail.couponDiscount || null,
            offerDiscount: orderDetail.offerDiscount || 0,
            placedAt: formatDate(orderDetail.placedAt),
        };
        
        // Include cancellation reason if it exists
        if (orderDetail.cancelRequested) {
            orderDetails.cancellationReason = orderDetail.cancellationReason || 'No reason provided';
        }
        

        console.log('Order details:', orderDetails);

        // Pass the retrieved details to the EJS template
        req.session.orderId = orderId; // Store orderId in session
        res.render("admin/orderDetailes", {
            title: "Order Details",
            orderId,
            user,
            order: orderDetails, // Pass the entire order details
        });
    } catch (error) {
        console.error('Error fetching order details:', error.message);
        next(error); // Pass the error to the next middleware or error handler
    }
};



  const getAdminCouponPage = async (req, res, next) => {
    try {
        const perPage = 8;
        const page = parseInt(req.query.page) || 1; // Ensure page is an integer
        const coupons = await couponModel.find({ isDeleted: false })
            .skip((perPage * page) - perPage)
            .limit(perPage);
        const count = await couponModel.countDocuments({ isDeleted: false });


        res.render("admin/adminCoupon", {
            title: "Admin Coupon",
            adminName: req.session.adminName,
            coupons,
            currentPage: page,
            totalPages: Math.ceil(count / perPage)
        });

        delete req.session.success;
    } catch (error) {
        console.log(error);
        next(error);
    }
};


  const doAddCoupon = async (req, res, next) => {
    try {
        const databody = req.body;
        console.log("checking", databody);

        // Check if the expiration date is in the past
        const expirationDate = new Date(databody.expireAt);
        const today = new Date();
        if (expirationDate < today) {
            return res.status(400).json({ message: "Expiration date cannot be in the past!" });
        }

        // Check if a coupon with the same code already exists
        const existingCoupon = await couponModel.findOne({ code: databody.code });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists!" });
        }

        await couponModel.collection.insertOne({
            code: databody.code,
            value: Number(databody.value),
            expiresAt: expirationDate,
            min_purchase: databody.min_purchase,
            isDeleted: false,
        });

        req.session.success = true;
        res.status(200).json({ message: "Coupon added successfully!" });
    } catch (error) {
        console.log(error);
        next(error);
    }
};


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
        const categories = await categoryModel.find(); 
        res.render('admin/editCoupon', { coupon, categories }); // Render the edit form with the coupon data
    } catch (err) {
        console.log(error.message);
    }
}

// Route to update the coupon in the database
const postEditCoupon = async (req, res) => {
    try {
        const { code, value, expireAt, min_purchase } = req.body;

        // Check if value is greater than 99
        if (value > 99) {
            return res.status(400).json({ message: "Coupon value cannot exceed 99%" });
        }

        // Check if min_purchase is 0
        if (min_purchase <= 0) {
            return res.status(400).json({ message: "Minimum purchase should not be 0" });
        }

        // Validate expiration date
        const currentDate = new Date();
        const expirationDate = new Date(expireAt);
        if (expirationDate <= currentDate) {
            return res.status(400).json({ message: " Expiration date cannot be in the past!" });
        }
        
        // Check if another coupon with the same code already exists
        const existingCoupon = await couponModel.findOne({ code, _id: { $ne: req.params.id } });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists!" });
        }

        // Find and update the coupon
        await couponModel.findByIdAndUpdate(req.params.id, {
            code,
            value,
            expiresAt: expirationDate,
            min_purchase
        });

        // Send success response
        res.status(200).json({ message: "Coupon updated successfully!" });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server Error" });
    }
};



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
            { categoryOffer: offerValue },
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
        const { orderId, newStatus ,productId} = req.body;
        console.log(req.body,"this is changing orderPage");
        const order_id=new ObjectId(orderId);
        const order = await orderModel.findById(order_id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        
        await orderModel.updateOne(
            { _id: order_id, "productsDetails.productId": new ObjectId(productId) }, 
            { 
                $set: { 
                    "productsDetails.$.productOrderStatus": newStatus // Use the positional $ operator to update the correct product
                } 
            }
        );
        
        if (newStatus.trim() === 'Cancelled' || newStatus.trim() === 'Return') {
            const product = order.productsDetails.find(p => p.productId.toString() === productId.toString());
        
            const refundAmount = product.price - (product.appliedOffer || 0) - (product.couponDiscount || 0);
        
            // Update the product's order status and refund amount
            await orderModel.updateOne(
                { _id: order_id, "productsDetails.productId": new ObjectId(productId) }, 
                { 
                    $set: { 
                        "productsDetails.$.productOrderStatus": newStatus.trim(), // Set the status as Cancelled or Return
                        "productsDetails.$.isCanceled": newStatus.trim() === 'Cancelled', // Mark the product as canceled if status is 'Cancelled'
                        "productsDetails.$.isReturned": newStatus.trim() === 'Return',   // Mark the product as returned if status is 'Return'
                        "productsDetails.$.refundAmount": refundAmount // Set the refund amount for the product
                    } 
                }
            );
        
            // Update product quantities in the inventory
            const updatePromises = order.productsDetails.map(async (item) => {
                const productId = new ObjectId(item.productId);
                const quantityToAdd = item.quantity;
        
                // Log for debugging
                console.log(`Updating product ${productId} with quantity ${quantityToAdd}`);
        
                return productModel.updateOne(
                    { _id: productId },
                    { $inc: { quantity: quantityToAdd } } // Increment the quantity back to stock
                );
            });
        
            await Promise.all(updatePromises);
            console.log("All product quantities updated successfully.");
        
            // Handle refund logic for Razorpay or Wallet payment methods
            if (order.paymentDetails.method === 'razorpay' || order.paymentDetails.method === 'wallet') {
                const existUser = await walletModel.findOne({ userId: order.userId });
        
                if (!existUser) {
                    // Create a new wallet for the user if one doesn't exist
                    await walletModel.create({
                        userId: order.userId,
                        balance: refundAmount, // Add the refund amount to the wallet balance
                        transactionDetails: [{
                            orderId: order._id,
                            paymentType: 'credit',
                            date: new Date(),
                            amount: refundAmount
                        }],
                    });
                } else {
                    // Update the existing wallet with the refund amount
                    await walletModel.updateOne(
                        { userId: order.userId },
                        {
                            $inc: { balance: refundAmount }, // Increment wallet balance by refund amount
                            $push: {
                                transactionDetails: {
                                    orderId: order._id,
                                    paymentType: 'credit',
                                    date: new Date(),
                                    amount: refundAmount
                                }
                            }
                        }
                    );
                }
        
                console.log(`Refund of ${refundAmount} credited to wallet for user ${order.userId}`);
            }
        }
        

        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


// const updateRefund = async (req, res) => {
//     try {
//         const { orderId } = req.body;

//         // Find the order and get the amount to be refunded
//         const order = await orderModel.findById(orderId); // No need for ObjectId wrapper
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }
//          if(order.paymentDetails.method ==='razorpay' ||order.paymentDetails.method ==="wallet"){
           
         
//         const amountToRefund = order.grandTotal;
//         // Find the wallet by userId
//         const existUser = await walletModel.findOne({ userId: order.userId });
         
//         if (!existUser) {
//             // If no wallet exists for the user, create a new wallet
//             await walletModel.create({
//                 userId: order.userId,
//                 balance: amountToRefund, // Initial balance is the refund amount
//                 transactionDetails: [{
//                     orderId:order.paymentDetails.orderId,
//                     paymentType: 'Credit',
//                     date: new Date(),
//                     amount: amountToRefund
//                 }],
//             });
//         } else {
//             // If wallet exists, update the balance and add to transactionDetails array
//             await walletModel.updateOne(
//                 { userId: order.userId },
//                 {
//                     $inc: { balance: amountToRefund }, // Increment balance by refund amount
//                     $push: {
//                         transactionDetails: {
//                             orderId:order.paymentDetails.orderId,

//                             paymentType: 'credit',
//                             date: new Date(),
//                             amount: amountToRefund
//                         }
//                     }
//                 }
//             );
//         }

//         res.json({ success: true, message: 'Wallet updated successfully' });
//     }
//     } catch (error) {
//         console.error('Error updating wallet:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// };
const getDashboardData = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;

        // Initialize the query for orders
        const query = [
            {
                $unwind: "$productsDetails" 
            },
            {
                $match: {
                    "productsDetails.productOrderStatus": "Delivered" 
                }
            },
            {
                $group: {
                    _id: "$_id"
                }
            }
        ];        
        const today = new Date();
        let datePeriod = "";
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}-${month}-${year}`;
        };

        // Determine the date range based on the report type
        switch (reportType) {
            case 'daily':
                const startDay = new Date();
                startDay.setUTCHours(0, 0, 0, 0);
                const endDay = new Date();
                endDay.setUTCHours(23, 59, 59, 999);
                query.placedAt = { $gte: startDay, $lte: endDay };
                datePeriod = `Date: ${formatDate(startDay)}`;
                break;

            case 'weekly':
                const startWeek = new Date(today);
                startWeek.setDate(today.getDate() - today.getDay());
                startWeek.setUTCHours(0, 0, 0, 0);
                const endWeek = new Date(startWeek);
                endWeek.setDate(startWeek.getDate() + 6);
                endWeek.setUTCHours(23, 59, 59, 999);
                query.placedAt = { $gte: startWeek, $lte: endWeek };
                datePeriod = `Week: ${formatDate(startWeek)} - ${formatDate(endWeek)}`;
                break;

            case 'monthly':
                const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                query.placedAt = { $gte: startMonth, $lte: endMonth };
                datePeriod = `Month: ${formatDate(startMonth)} - ${formatDate(endMonth)}`;
                break;

            case 'yearly':
                const startYear = new Date(today.getFullYear(), 0, 1);
                const endYear = new Date(today.getFullYear() + 1, 0, 0);
                query.placedAt = { $gte: startYear, $lte: endYear };
                datePeriod = `Year: ${startYear.getFullYear()}`;
                break;

            case 'custom':
                if (startDate && endDate) {
                    query.placedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
                    datePeriod = `Custom Range: ${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`;
                }
                break;

            default:
                break;
        }

        // Count total orders matching the query
        // const totalOrders = await orderModel.countDocuments(query);
        // console.log('Total Orders:', totalOrders);

        // Aggregate total sales for the sales graph based on reportType
        let groupByFormat;
        switch (reportType) {
            case 'daily':
                groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } };
                break;
            case 'weekly':
                groupByFormat = { $isoWeek: "$placedAt" };
                break;
            case 'monthly':
                groupByFormat = { $dateToString: { format: "%Y-%m", date: "$placedAt" } };
                break;
            case 'yearly':
                groupByFormat = { $dateToString: { format: "%Y", date: "$placedAt" } };
                break;
            default:
                groupByFormat = { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } };
                break;
        }
        
        // Aggregate sales data
        const salesData = await orderModel.aggregate([
            {
                $unwind: "$productsDetails"
            },
            {
                $match: {
                    "productsDetails.productOrderStatus": "Delivered", // Match only delivered products
                    placedAt: query.placedAt // Ensure the date filter is applied
                 }
            },
            {
                $group: {
                    _id: groupByFormat,
                    totalSales: { 
                        $sum: {
                            $toDouble: { $ifNull: ["$productsDetails.offerPrice", 0] } 
                        } 
                    },
                    totalOrders: { $sum: 1 },
                    totalCouponDiscount: { 
                        $sum: { 
                            $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } 
                        } 
                    },
                    totalOfferDiscount: { 
                        $sum: { 
                            $toDouble: { $ifNull: ["$productsDetails.appliedOffer", 0] } // Assuming appliedOffer is equivalent to offerDiscount
                        } 
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        
        console.log('Sales Data:', salesData);
        const firstEntry = salesData[0];

        // Destructuring to get values
        const { _id, totalSales, totalOrders, totalCouponDiscount, totalOfferDiscount } = firstEntry;
        // Aggregate total sales and discount for overall metrics
        const totalSalesMetrics = await orderModel.aggregate([
            {
                $unwind: "$productsDetails"
            },
            {
                $match: {
                    "productsDetails.productOrderStatus": "Delivered"
                }
            },
            {
                $group: {
                    _id: null,
                    totalGrandTotal: { $sum: { $toDouble: "$grandTotal" } },
                    totalDiscount: { $sum: { $toDouble: "$couponDiscount" } },
                    totalOfferAmount: { $sum: { $toDouble: "$offerDiscount" } }
                }
            }
        ]);
        
        const {  totalGrandTotal, totalDiscount, totalOfferAmount } = totalSalesMetrics[0] || { totalGrandTotal: 0, totalDiscount: 0, totalOfferAmount: 0 };

        const activeUsers = await userModel.countDocuments({ is_active: true });

        const totalSalesCount = salesData.reduce((acc, item) => acc + item.totalSales, 0);
        const totalOrdersCount = salesData.reduce((acc, item) => acc + item.totalOrders, 0);

        const profit = totalGrandTotal - totalDiscount;
        const profitPercentage = ((profit / totalGrandTotal) * 100).toFixed(2) || 0;
        const salesPercentage = ((totalSalesCount / totalGrandTotal) * 100).toFixed(2) || 0;
        const visitsPercentage = ((totalOrdersCount / activeUsers) * 100).toFixed(2) || 0;
        const customersPercentage = ((activeUsers / totalOrdersCount) * 100).toFixed(2) || 0;

        const formattedSalesData = salesData.map(item => ({
            label: item._id,
            totalSales: item.totalSales,
            totalOrders: item.totalOrders,
        }));
        const sales = formattedSalesData.map(item => item.totalSales);
        const offerDiscount = salesData.map(item => item.totalOfferDiscount);
        const couponDiscount = salesData.map(item => item.totalCouponDiscount);

        // Filter orderDetails based on the same date range
        const orderDetails = await orderModel.aggregate([
            {
                $unwind: "$productsDetails"
            },
            {
                $match: {
                    "productsDetails.productOrderStatus": "Delivered",
                    placedAt: query.placedAt // Apply date filter
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productsDetails.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $unwind: "$productInfo"
            },
            {
                $lookup: {
                    from: "addresses",
                    localField: "deliveryAddress",
                    foreignField: "_id",
                    as: "addressInfo"
                }
            },
            {
                $unwind: "$addressInfo"
            },
            {
                $project: {
                    order_id: "$_id",

                    product_name: "$productInfo.pname",
                    productDescription:"$productInfo.description",
                    price:"$productsDetails.price",
                    appliedOffer:"$productsDetails.appliedOffer",

                    image: "$productInfo.image",
                    quantity: "$productsDetails.quantity",
                    productStatus: "$productsDetails.productOrderStatus",
                    offerPrice: "$productsDetails.offerPrice",
                    couponDiscount: "$productsDetails.couponDiscount",
                    shippingAddress: "$addressInfo",
                    paymentMethod: "$paymentDetails.method",
                    orderId:"$paymentDetails.orderId"

                }
            },
            {
                $sort: { placedAt: -1 }
            }
        ]).exec();

        console.log('Order Details:', orderDetails);

        // Send the response back to the client with all required data
        res.json({
            totalSales,
            totalCouponDiscount,
            totalOfferDiscount,
            totalGrandTotal,
            totalOrders,
            totalDiscount,
            
            totalOfferAmount,
            activeUsers,
            salesData,
            couponDiscount,
            offerDiscount,
            sales,
            orders: orderDetails,
            datePeriod,
            percentages: {
                profit: profitPercentage,
                sales: salesPercentage,
                visits: visitsPercentage,
                customers: customersPercentage
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};









const getSalesData = async (reportType, startDate, endDate) => {
    let query = { orderStatus: { $ne: ' Cancelled' } }; 

    if (reportType === 'daily') {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0); // Start of the day in UTC
        const end = new Date();
        end.setUTCHours(23, 59, 59, 999); 

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

    const salesData = await orderModel.aggregate([
        { $match: query },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
                totalSales: { $sum: { $toDouble: "$grandTotal" } }
            }
        },
        { $sort: { _id: 1 } }
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
            { productOffer: offerValue }, 
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
    const reportType = req.query.reportType;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const orders = JSON.parse(req.query.orders || '[]')
    .filter(order => order.orderStatus !== 'payment pending' && order.orderStatus !== 'cancelled');
      console.log(req.query);
    try {
        const salesData = await getSalesData(reportType, startDate, endDate);
        
        const totalMetrics = await getTotalMetrics(reportType, startDate, endDate);

        // Creating  new PDF document
        const doc = new PDFDocument();
        const filename = `Sales_Report_${Date.now()}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res); // Stream PDF to response

        // Title
        doc.fontSize(24).font('Helvetica').text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);

        // Overall Metrics
        doc.fontSize(16).font('Helvetica-Bold').text('Overall Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Total Sales: ₹${totalMetrics.totalGrandTotal.toFixed(2)}`);
        doc.text(`Total Orders: ${totalMetrics.totalOrders}`);
        doc.text(`Total Discount: ₹${totalMetrics.totalDiscount.toFixed(2)}`);
        doc.moveDown(1);

        // Sales Data Section
        doc.fontSize(16).font('Helvetica-Bold').text('Sales Data', { underline: true });
        doc.moveDown(0.5);

        // Draw Sales Data as a list
        salesData.forEach(data => {
            doc.fontSize(10).font('Helvetica').text(`Date: ${data._id} | Total Sales: ₹${data.totalSales.toFixed(2)}`);
            doc.moveDown(0.2);
        });

        // Order Details Section
        doc.moveDown(1);
        doc.fontSize(16).font('Helvetica-Bold').text('Order Details', { underline: true });
        doc.moveDown(0.5);

        // Draw the table
        const startX = 50;
        const startY = doc.y;
        const rowHeight = 20; // Decreased row height for compactness
        const columnWidths = [190, 80, 80, 80]; // Increased width for Order ID column, removed Customer Name
        const headers = ['Order ID', 'Product Name', 'Quantity', 'Total'];

        // Draw table header
        headers.forEach((header, index) => {
            doc.rect(startX + index * columnWidths[index], startY, columnWidths[index], rowHeight).fillAndStroke('lightgrey', 'black');
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold').text(header, startX + index * columnWidths[index] + 5, startY + 5); // Adjusted font size
        });

        // Draw each order as a row in the table
        orders.forEach((order, index) => {
            const rowY = startY + (index + 1) * rowHeight + 20; // Adjust row position

            // Draw each cell
            doc.rect(startX, rowY, columnWidths[0], rowHeight).stroke();
            doc.text(order.orderId, startX + 5, rowY + 5); // Add a slight offset for text

            doc.rect(startX + columnWidths[0], rowY, columnWidths[1], rowHeight).stroke();
            doc.text(order.productName, startX + columnWidths[0] + 5, rowY + 5);

            doc.rect(startX + columnWidths[0] + columnWidths[1], rowY, columnWidths[2], rowHeight).stroke();
            doc.text(order.quantity.toString(), startX + columnWidths[0] + columnWidths[1] + 5, rowY + 5);

            doc.rect(startX + columnWidths[0] + columnWidths[1] + columnWidths[2], rowY, columnWidths[3], rowHeight).stroke();
            doc.text(`₹${parseFloat(order.total.replace(/₹/, '').replace(/,/g, '')).toFixed(2)}`, startX + columnWidths[0] + columnWidths[1] + columnWidths[2] + 5, rowY + 5);
        });

        // Finalize the PDF
        doc.end(); // Finalize the PDF
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ message: 'Error generating PDF report' });
    }
};

const getOrderDetails = async (reportType, startDate, endDate) => {
    const query = {
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };

    if (reportType) {
        query.reportType = reportType; 
    }

    try {
        const orders = await orderModel.find(query).select('orderId productName quantity total createdAt'); // Select the fields you need
        return orders;
    } catch (error) {
        console.error('Error fetching order details:', error);
        throw error; 
    }
};


// Implement a new function to get total metrics
const getTotalMetrics = async (reportType, startDate, endDate) => {
    let query = { orderStatus: { $ne: ' Cancelled' } }; // Only include confirmed orders

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
        // Fetch sales data and total metrics
        const salesData = await getSalesData(reportType, startDate, endDate); // Fetch sales data based on report type and date range
        const { totalOrders, totalDiscount, totalGrandTotal } = await getTotalMetrics(reportType, startDate, endDate); // Fetch total metrics

        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Prepare summary data
        const summaryData = [
            { Metric: "Total Sales", Value: `₹${totalGrandTotal.toFixed(2)}` },
            { Metric: "Total Orders", Value: totalOrders },
            { Metric: "Total Discount", Value: `₹${totalDiscount.toFixed(2)}` }
        ];

        // Create a worksheet for summary data and add it to the workbook
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Create a worksheet for sales data
        const salesDataSheet = salesData.map(data => ({
            Date: data._id,                // Date
            'Total Sales': `₹${data.totalSales.toFixed(2)}` // Total Sales formatted
        }));
        const salesSheet = XLSX.utils.json_to_sheet(salesDataSheet);
        XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Data');

        // Prepare order details
        const orders = await getOrderDetails(reportType, startDate, endDate); // Assume this function fetches the orders
        const orderDetailsData = orders.map(order => ({
            'Order ID': order.orderId,
            'Product Name': order.productName,
            'Quantity': order.quantity,
            'Total': `₹${parseFloat(order.total.replace(/₹/, '').replace(/,/g, '')).toFixed(2)}`
        }));

        const orderDetailsSheet = XLSX.utils.json_to_sheet(orderDetailsData);
        XLSX.utils.book_append_sheet(wb, orderDetailsSheet, 'Order Details');

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
    categoryData,
    paymentData,
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
    // updateRefund,
    getDownloadPdf,
    downloadExcel,
    addCatOffer,
    removeCatOffer,
    addProductOffer,
    removeProductOffer,

}




















