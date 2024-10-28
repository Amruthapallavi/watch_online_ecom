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
        { $unwind: '$productsDetails' },
        {
            $match: { 
                'productsDetails.productOrderStatus': 'Delivered' 
            }
        },
        {
            $group: {
                _id: '$productsDetails.productId',
                totalQuantity: { $sum: '$productsDetails.quantity' } 
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
    
        { $unwind: '$productsDetails' },
        {
            $match: { 
                'productsDetails.productOrderStatus': 'Delivered'
            }
        },
        {
            $lookup: {
                from: 'products', 
                localField: 'productsDetails.productId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },

        {
            $group: {
                _id: '$productDetails.category', 
                totalQuantity: { $sum: '$productsDetails.quantity' }
            }
        },

        {
            $lookup: {
                from: 'categories',  
                localField: '_id',   
                foreignField: '_id', 
                as: 'categoryDetails'
            }
        },
        { $unwind: '$categoryDetails' },

        {
            $project: {
                categoryId: '$_id',
                categoryName: '$categoryDetails.cname', 
                totalQuantity: 1
            }
        },

        { $sort: { totalQuantity: -1 } },

        { $limit: 4 }
    ]);
};
const getTopSellingBrands = async () => {
    return await orderModel.aggregate([
        { $unwind: '$productsDetails' },
        {
            $match: { 
                'productsDetails.productOrderStatus': 'Delivered' 
            }
        },
        {
            $lookup: {
                from: 'products',  
                localField: 'productsDetails.productId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' },

        {
            $group: {
                _id: '$productDetails.brand',  
                totalQuantity: { $sum: '$productsDetails.quantity' }
            }
        },

        {
            $project: {
                brand: '$_id',  
                totalQuantity: 1
            }
        },

        { $sort: { totalQuantity: -1 } },

        { $limit: 4 }
    ]);
};


const getHomePage = async (req, res) => {
    try {
        const overall = await orderModel.aggregate([
            {
                $unwind: "$productsDetails"      
            },
            {
                $match: {
                    
                        "productsDetails.productOrderStatus": { $in: ['Confirmed', 'Delivered', 'Pending'] }
                    
                                    }
            },
            {
                $project: {
                    offerPrice: { $toDouble: { $ifNull: ["$productsDetails.offerPrice", 0] } },
                    couponDiscount: { $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } },
                    orderCouponDiscount: { $toDouble: { $ifNull: ["$couponDiscount", 0] } }, // Get couponDiscount from the order
                    appliedOffer: "$productsDetails.appliedOffer"
                }
            },
            {
                $group: {
                    _id: null,
                    totalGrandTotal: {
                        $sum: {
                            $subtract: [
                                "$offerPrice",
                                "$couponDiscount"
                            ]
                        }
                    },
                    totalCouponDiscount: { $sum: "$orderCouponDiscount" }, // Sum the coupon discounts from the order level
                    totalOfferDiscount: { 
                        $sum: { 
                            $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } 
                        } 
                    }, 
                    totalAppliedOffers: {
                        $sum: {
                            $cond: {
                                if: { $isArray: "$appliedOffer" },
                                then: {
                                    $reduce: {
                                        input: "$appliedOffer", 
                                        initialValue: 0,
                                        in: { $add: ["$$value", { $toDouble: { $ifNull: ["$$this", 0] } }] }
                                    }
                                },
                                else: { $toDouble: { $ifNull: ["$appliedOffer", 0] } }
                            }
                        }
                    },
                    totalOrders: { $sum: 1 } 
                }
            }
        ]);
        
        
        
        
        const activeUsers = await userModel.countDocuments({ is_active: true });

        const topProducts = await getTopSellingProducts();
        const topCategories = await getTopSellingCategories();
        const topBrands = await getTopSellingBrands();
        const categorySales = await categoryData(); 
        const paymentMethods = await paymentData(); 

        const categoryLabels = categorySales.map(category => category.cname);
        const orders = await orderModel.aggregate([
            {
                $lookup: {
                    from: "users", 
                    localField: "userId", 
                    foreignField: "_id", 
                    as: "userInfo" 
                }
            },
            {
                $unwind: "$userInfo" 
            },
            {
                $unwind: "$productsDetails" 
            },
            {
                $lookup: {
                    from: "products", // Product collection name
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
                    user_id: "$userId", // I
                    user_name: "$userInfo.name", // User name
                    product_name: "$productInfo.pname", 
                    image: "$productInfo.image",
                    productDescription: "$productInfo.description",
                    quantity: "$productsDetails.quantity",
                    price: "$productsDetails.price",
                    appliedOffer: "$productsDetails.appliedOffer",
                    offerPrice: "$productsDetails.offerPrice",
                    couponDiscount: "$productsDetails.couponDiscount",
                    productStatus: "$productsDetails.productOrderStatus",
                    grandTotal: "$grandTotal", 
                    total: "$paymentDetails.grandTotal", 
                    shippingAddress: "$addressInfo", // Address information
                    paymentMethod: "$paymentDetails.method", 
                    orderId: "$paymentDetails.orderId",
                    placedAt: 1 
                }
            },
            {
                $sort: { placedAt: -1 } 
            }
        ]).exec();
        console.log(overall[0],"checking data");
        
        res.render('admin/adminDashBoard', {
            title: 'admin_home',
            data: overall[0],
            activeUsers,
            topProducts,
            orders,
            topCategories,
            topBrands,
            categorySales,
            paymentMethods, 
            categoryLabels 
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};


const categoryData = async () => {
    try {
        const categorySales = await orderModel.aggregate([
            { $unwind: '$productsDetails' },
            {
                $match: {
                    'productsDetails.productOrderStatus': 'Delivered'
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productsDetails.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo.cname',
                    totalSales: { $sum: '$grandTotal' }
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
        
        return categorySales;
    } catch (error) {
        console.error('Error fetching category sales data:', error);
        throw error; 
    }
};

const paymentData = async () => {
    try {
        const paymentMethods = await orderModel.aggregate([
            {
                $match: {
                    'productsDetails.productOrderStatus': { $eq:"Delivered" }
                }
            },
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
        throw error; 
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
     

        res.render('admin/adminProducts',{
            title:"products",
            data: products,
        adminName: req.session.adminName,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / perPage)
        });
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
        const images = req.files ? req.files.map(element => element.filename) : [];
        const croppedImages = Object.keys(data)
            .filter(key => key.startsWith('croppedImage_'))
            .map(key => data[key]);

        if (!data.pname || !data.category || !data.quantity || !data.price) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const croppedImageFiles = [];

        for (let i = 0; i < croppedImages.length; i++) {
            const imageData = croppedImages[i];
            if (imageData.startsWith('data:image/png;base64,')) {
                const base64Data = imageData.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `cropped_image_${Date.now()}_${i}.png`;
                const filePath = path.join(__dirname, '../uploadedImages', fileName);

                fs.writeFileSync(filePath, buffer);
                croppedImageFiles.push(fileName);
            } else {
                console.error('Invalid image data format:', imageData);
                return res.status(400).json({ message: "Invalid image data format." });
            }
        }

        const allImages = [...croppedImageFiles];

        await productModel.collection.insertOne({
            pname: data.pname,
            category: new ObjectId(data.category),
            quantity: parseInt(data.quantity, 10), 
            description: data.description,
            price: parseFloat(data.price),
            image: allImages 
        });

        res.status(201).json({ message: "Product added successfully." });
    } catch (error) {
        console.error(error);  
        res.status(500).json({ message: "Error adding product." });
    }
};


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




const addCategory = async (req, res) => {
    const { cname } = req.body; //
    try {
        const existingCategory = await categoryModel.findOne({ cname: { $regex: new RegExp(`^${cname}$`, 'i') } });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category already exists." });
        }

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

const updateCategory = async (req, res) => {
    try {
        const catId = req.params.id; 
        const { cname } = req.body; 

        const existingCategory = await categoryModel.findOne({
            cname: { $regex: new RegExp(`^${cname}$`, 'i') },
            _id: { $ne: catId } 
        });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category name already exists" });
        }

        await categoryModel.updateOne({ _id: catId }, { $set: { cname: cname } });

        return res.status(200).json({ success: true, message: "Category updated successfully" });

    } catch (error) {
        console.error("Error updating category:", error.message);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};



//only 1 cropped image is saving 

// const updateEditProduct = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const data = req.body;
//   console.log(req.files);
//         // Array to hold new and existing images
//         const newImages = req.files ? req.files.map(element => element.filename) : [];
        
//         // Handling cropped images from the body data
//         const croppedImages = Object.keys(data)
//             .filter(key => key.startsWith('croppedImage_'))
//             .map(key => data[key]);

//         const croppedImageFiles = [];
//         for (let i = 0; i < croppedImages.length; i++) {
//             const imageData = croppedImages[i];
//             if (imageData.startsWith('data:image/png;base64,')) {
//                 const base64Data = imageData.split(',')[1];
//                 const buffer = Buffer.from(base64Data, 'base64');
//                 const fileName = `cropped_image_${Date.now()}_${i}.png`;
//                 const filePath = path.join(__dirname, '../uploadedImages', fileName);

//                 // Save the cropped image to disk
//                 fs.writeFileSync(filePath, buffer);
//                 croppedImageFiles.push(fileName);
//             } else {
//                 console.error('Invalid image data format:', imageData);
//                 return res.status(400).json({ message: "Invalid image data format." });
//             }
//         }

//         // Collect all new and cropped images
//         const images = [croppedImageFiles];

//         // Get images marked for deletion
//         const deletedImages = Array.isArray(data.deletedImages) ? data.deletedImages : [data.deletedImages].filter(Boolean);

//         // If there are images to delete, remove them from storage
//         if (deletedImages.length > 0) {
//             deletedImages.forEach(image => {
//                 const imagePath = path.join(__dirname, '../uploadedImages', image);
//                 fs.unlink(imagePath, err => {
//                     if (err) {
//                         console.error(`Failed to delete image: ${image}`, err);
//                     }
//                 });
//             });
//         }

//         // Update the product in the database
//         await productModel.updateOne({ _id: new ObjectId(productId) }, {
//             $set: {
//                 pname: data.pname,
//                 category: new ObjectId(data.category),
//                 quantity: parseInt(data.quantity, 10),
//                 description: data.description,
//                 price: parseFloat(data.price),
//                 image: images.length === 0 ? undefined : images,  // If no new images, keep existing ones
//             }
//         });

//         // Redirect or respond with success message
//         res.redirect('/products');
//     } catch (error) {
//         console.error('Error updating product:', error);
//         res.status(500).send('Server Error');
//     }
// };


const updateEditProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const data = req.body;
        console.log(req.body,"reqqqq");
        const {deletedImage}=req.body;
        // Array to hold new and existing images
        const newImages = req.files ? req.files.map(element => element.filename) : [];
        
        // Handling cropped images from the body data
        const croppedImages = Object.keys(data)
            .filter(key => key.startsWith('croppedImage_'))
            .map(key => data[key]);

        const croppedImageFiles = [];
        for (let i = 0; i < croppedImages.length; i++) {
            const imageData = croppedImages[i];
            if (imageData.startsWith('data:image/png;base64,')) {
                const base64Data = imageData.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `cropped_image_${Date.now()}_${i}.png`;
                const filePath = path.join(__dirname, '../uploadedImages', fileName);

                // Save the cropped image to disk
                fs.writeFileSync(filePath, buffer);
                croppedImageFiles.push(fileName);
            } else {
                console.error('Invalid image data format:', imageData);
                return res.status(400).json({ message: "Invalid image data format." });
            }
        }
        const images = [...croppedImageFiles];

        const deletedImages = Array.isArray(data.deletedImages) ? data.deletedImages : [data.deletedImages].filter(Boolean);

        const product = await productModel.findById(productId);
        const existingImages = product.image.filter(img => !deletedImages.includes(img));

        if (deletedImages.length > 0) {
            deletedImages.forEach(image => {
                const imagePath = path.join(__dirname, '../uploadedImages', image);
                fs.unlink(imagePath, err => {
                    if (err) {
                        console.error(`Failed to delete image: ${image}`, err);
                    }
                });
            });
        }

        const allImages = [...existingImages, ...images];

        await productModel.updateOne({ _id: new ObjectId(productId) }, {
            $set: {
                pname: data.pname,
                category: new ObjectId(data.category),
                brand:data.brand,
                quantity: parseInt(data.quantity, 10),
                description: data.description,
                price: parseFloat(data.price),
                image: allImages.length === 0 ? undefined : allImages, // Keep undefined if no images
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

        // Validate ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
            return res.status(400).json({ error: 'Invalid product ID format' });
        }

        const id = new ObjectId(productId);
        const catData = await categoryModel.find();

        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Set default for images if not present
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
        res.status(500).json({ error: 'Internal server error' }); // More descriptive error response
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

        category.cname = cname;
        const updatedCategory = await category.save();

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
        let { code, value, expireAt, min_purchase, max_discount } = req.body;

        code = code.trim();
        value = value ? parseInt(value) : null;
        min_purchase = min_purchase ? parseFloat(min_purchase) : null;
        max_discount = max_discount ? parseFloat(max_discount) : null;

        // Validate that no field is empty or contains only spaces
        if (!code || !value || !expireAt || !min_purchase || !max_discount) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Check if code is only spaces
        if (code === "") {
            return res.status(400).json({ message: "Coupon code cannot be empty or only spaces!" });
        }
        
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
            max_discount:databody.max_discount,
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

const postEditCoupon = async (req, res) => {
    try {
        let { code, value, expireAt, min_purchase , max_discount} = req.body;
        code = code.trim();
        value = value ? parseInt(value) : null;
        min_purchase = min_purchase ? parseFloat(min_purchase) : null;
        max_discount = max_discount ? parseFloat(max_discount) : null;

        // Validate that no field is empty or contains only spaces
        if (!code || !value || !expireAt || !min_purchase || !max_discount) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Check if code is only spaces
        if (code === "") {
            return res.status(400).json({ message: "Coupon code cannot be empty or only spaces!" });
        }        // Check if value is greater than 99
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

        if (max_discount <= 0) {
            return res.status(400).json({ message: " maximun discount should not be 0" });
        }

        // Find and update the coupon
        await couponModel.findByIdAndUpdate(req.params.id, {
            code,
            value,
            expiresAt: expirationDate,
            min_purchase,
            max_discount,
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
                    _id: {
                        $dateToString: {
                            format: getDateFormat(reportType),
                            date: "$placedAt"
                        }
                    },
                    totalSales: {
                        $sum: {
                            $subtract: [
                                { $toDouble: { $ifNull: ["$productsDetails.offerPrice", 0] } }, 
                                { $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } } 
                            ]
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

        // Handle the case when salesData is empty
        const firstEntry = salesData[0] || { _id: null, totalSales: 0, totalOrders: 0, totalCouponDiscount: 0, totalOfferDiscount: 0 };

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

        const { totalGrandTotal, totalDiscount, totalOfferAmount } = totalSalesMetrics[0] || { totalGrandTotal: 0, totalDiscount: 0, totalOfferAmount: 0 };

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
                    productId:'$productsDetails.productId',
                    productDescription: "$productInfo.description",
                    price: "$productsDetails.price",
                    appliedOffer: "$productsDetails.appliedOffer",
                    image: "$productInfo.image",
                    quantity: "$productsDetails.quantity",
                    productStatus: "$productsDetails.productOrderStatus",
                    offerPrice: "$productsDetails.offerPrice",
                    total: {
                        $subtract: [
                            "$productsDetails.offerPrice", 
                            { $ifNull: ["$productsDetails.couponDiscount", 0] } // If couponDiscount is null, use 0
                        ]
                    },
                    couponDiscount: "$productsDetails.couponDiscount",
                    shippingAddress: "$addressInfo",
                    paymentMethod: "$paymentDetails.method",
                    orderId: "$paymentDetails.orderId",
                    placedAt: 1 // Include placedAt in the project stage
                }
            },
            {
                $sort: { placedAt: -1 } // Sort by placedAt from new to old
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

const getDateFormat = (reportType) => {
    switch (reportType) {
        case 'daily':
            return '%Y-%m-%d';
        case 'weekly':
            return '%Y-%m-%W';
        case 'monthly':
            return '%Y-%m';
        case 'yearly':
            return '%Y';
        default:
            return '%Y-%m-%d';
    }
};











const getSalesData = async (reportType, startDate, endDate) => {
    let query = {
        orderStatus: { $ne: 'Cancelled' },
        productDetails: { 
            $elemMatch: { productOrderStatus: 'Delivered' } 
        }
    };
    
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
    console.log(req.query, "this is pdf data");
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const orders = JSON.parse(req.query.orders || '[]')
        .filter(order => order.status !== 'payment pending' && order.orderStatus !== 'cancelled');

    try {
        const salesData = await getSalesData(reportType, startDate, endDate);
        
        const totalMetrics = await getTotalMetrics(reportType, startDate, endDate);
        console.log(totalMetrics,"chcekinggg");
        const totalSales = orders.reduce((sum, order) => {
            return sum + parseFloat(order.total.replace(/₹/, '').replace(/,/g, '')) || 0;
        }, 0);

        const deliveredOrdersCount = orders.filter(order => order.status === 'Delivered').length;

        // Creating new PDF document
        const doc = new PDFDocument();
        const filename = `Sales_Report_${Date.now()}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res); // Stream PDF to response

        doc.fontSize(24).font('Helvetica').text('Sales Report', { align: 'center' });
        doc.moveDown(0.5);

        // Overall Metrics
        doc.fontSize(16).font('Helvetica-Bold').text('Overall Metrics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Total Sales: ₹${totalMetrics.metrics.totalGrandTotal}`);
        doc.text(`Total Orders: ${totalMetrics.metrics.totalOrders}`);
        doc.text(`Total Discount: ₹${totalMetrics.metrics.totalOfferDiscount}`);
        doc.text(`Total Coupon Discount: ₹${totalMetrics.metrics.totalAppliedOffers}`);

        doc.moveDown(1);

        // Sales Data Section
        doc.fontSize(16).font('Helvetica-Bold').text('Sales Data', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).font('Helvetica').text(`Date Range: ${formatDate(totalMetrics.startDate)} to ${formatDate(totalMetrics.endDate)}`);
        doc.moveDown(0.5);
        doc.text(`Total Sales: ₹${totalSales.toFixed(2)}`);
        doc.moveDown(0.5);
        doc.text(`Delivered Orders: ${deliveredOrdersCount}`); 
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
        const rowHeight = 25; // Decreased row height for compactness
        const columnWidths = [190,90, 90, 90]; 
        const headerWidths = [260, 110, 110, 110]; // Increased header widths

        const headers = ['Order ID', 'Product Name', 'Quantity', 'Total'];

        // Draw table header
        headerWidths.forEach((headerWidth, index) => {
            doc.rect(startX + index * headerWidth, startY, headerWidth, rowHeight).fillAndStroke('lightgrey', 'black');
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold').text(headers[index], startX + index * headerWidth + 5, startY + 5); // Adjusted font size
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
const getTotalMetrics = async (reportType, startDate , endDate) => {

    const now = new Date();
    switch (reportType) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // End is the start of the next day
            break;
        case 'weekly':
            const dayOfWeek = now.getDay(); // Sunday - Saturday : 0 - 6
            startDate = new Date(now.setDate(now.getDate() - dayOfWeek)); // Start of the week
            endDate = new Date(now.setDate(now.getDate() + 7)); // End of the week
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Start of the next month
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1); // Start of the year
            endDate = new Date(now.getFullYear() + 1, 0, 1); // Start of the next year
            break;
        case 'custom':
            if (startDate && endDate) {
                startDate = new Date(startDate);
                endDate = new Date(endDate);
            } else {
                throw new Error("Custom date range is required for 'custom' report type.");
            }
            break;
        default:
            throw new Error("Invalid report type. Valid types are 'daily', 'weekly', 'monthly', 'yearly', 'custom'.");
    }


    
    const totalSalesMetrics = await orderModel.aggregate([
        {
            $unwind: "$productsDetails" // Unwind productsDetails to handle individual products
        },
        {
            $match: {
                "productsDetails.productOrderStatus": { $nin: ['Cancelled', 'payment pending', 'Confirmed','Return'] }, // Exclude products with 'Cancelled' or 'payment pending' status
                // placedAt: { $gte: startDate, $lt: endDate } // Filter orders based on date range
            }
        },
        {
            $group: {
                _id: null,
                totalGrandTotal: {
                    $sum: {
                        $subtract: [
                            { $toDouble: { $ifNull: ["$productsDetails.offerPrice", 0] } },
                            { $ifNull: [{ $toDouble: "$productsDetails.couponDiscount" }, 0] }
                        ]
                    }
                },
                totalOfferDiscount: { $sum: { $toDouble: { $ifNull: ["$productsDetails.couponDiscount", 0] } } },
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

    console.log(totalSalesMetrics, "total sales metrics");
    return {
        metrics: totalSalesMetrics[0] || { totalGrandTotal: 0, totalDiscount: 0, totalOrders: 0 },
        startDate: startDate,
        endDate: endDate
    };};


// const downloadExcel = async (req, res) => {
//     const { reportType, startDate, endDate } = req.query;

//     try {
//         // Fetch sales data and total metrics
//         const salesData = await getSalesData(reportType, startDate, endDate); // Fetch sales data based on report type and date range
//         const { totalOrders, totalDiscount, totalGrandTotal } = await getTotalMetrics(reportType, startDate, endDate); // Fetch total metrics

//         // Create a new workbook
//         const wb = XLSX.utils.book_new();

//         // Prepare summary data
//         const summaryData = [
//             { Metric: "Total Sales", Value: `₹${totalGrandTotal.toFixed(2)}` },
//             { Metric: "Total Orders", Value: totalOrders },
//             { Metric: "Total Discount", Value: `₹${totalDiscount}` }
//         ];

//         // Create a worksheet for summary data and add it to the workbook
//         const summarySheet = XLSX.utils.json_to_sheet(summaryData);
//         XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

//         // Create a worksheet for sales data
//         const salesDataSheet = salesData.map(data => ({
//             Date: data._id, // Date
//             'Total Sales': `₹${data.totalSales.toFixed(2)}` // Total Sales formatted
//         }));
        
//         const salesSheet = XLSX.utils.json_to_sheet(salesDataSheet);
//         XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Data');

//         // Prepare order details
//         const orders = await getOrderDetails(reportType, startDate, endDate); // Assume this function fetches the orders
//         const orderDetailsData = orders.map(order => ({
//             'Order ID': order.orderId,
//             'Product Name': order.productName,
//             'Quantity': order.quantity,
//             'Total': `₹${parseFloat(order.total.replace(/₹/, '').replace(/,/g, '')).toFixed(2)}` // Format total as currency
//         }));

//         // Create a worksheet for order details
//         const orderDetailsSheet = XLSX.utils.json_to_sheet(orderDetailsData);
//         XLSX.utils.book_append_sheet(wb, orderDetailsSheet, 'Order Details');

//         // Generate Excel file as a buffer
//         const buffer = XLSX.write(wb, {
//             bookType: 'xlsx',
//             type: 'buffer'
//         });

//         // Set headers to prompt a file download
//         const filename = `Sales_Report_${Date.now()}.xlsx`;
//         res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

//         // Send the buffer as the response
//         res.send(buffer);
//     } catch (error) {
//         console.error('Error generating Excel report:', error);
//         res.status(500).json({ message: 'Error generating Excel report' });
//     }
// };
const downloadExcel = async (req, res) => {
    const { reportType, startDate, endDate } = req.query;
    const orders = JSON.parse(req.query.orders || '[]')
    .filter(order => order.status !== 'payment pending' && order.orderStatus !== 'cancelled');
console.log(orders,"this is order");
    try {
        console.log("Fetching sales data for:", { reportType, startDate, endDate });
        const salesData = await getSalesData(reportType, startDate, endDate);
        console.log("Sales Data:", salesData); // Log the sales data

        console.log("Fetching total metrics for:", { reportType, startDate, endDate });
        const totalMetrics = await getTotalMetrics(reportType, startDate, endDate);

        // console.log("Total Metrics:", { totalOrders, totalOfferDiscount, totalGrandTotal }); // Log the metrics

        // Prepare the workbook
        const wb = XLSX.utils.book_new();

        // Summary Data
        const summaryData = [
            { Metric: "Date Range", Value: `₹${formatDate(totalMetrics.startDate)} - ₹${formatDate(totalMetrics.endDate)}` },

            { Metric: "Total Sales", Value: `₹${totalMetrics.metrics.totalGrandTotal}` },
            { Metric: "Total Orders", Value: `₹${totalMetrics.metrics.totalOrders}` },

            { Metric: "Total Discount", Value: `₹${totalMetrics.metrics.totalOfferDiscount}` }
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Sales Data Sheet
        const salesDataSheet = salesData.map(data => ({
            Date: startDate - endDate|| 'No Date',
            'Total Sales': `₹${data.totalSales ? data.totalSales.toFixed(2) : 0}`
        }));
        console.log("Sales Data Sheet:", salesDataSheet); // Log the prepared sales data sheet

        const salesSheet = XLSX.utils.json_to_sheet(salesDataSheet);
        XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales Data');

        // Fetching actual order details
        console.log("Fetching order details for:", { reportType, startDate, endDate });
        console.log("Orders:", orders); // Log the orders

        const orderDetailsData = orders.map(order => ({
            'Order ID': order.orderId,
            'Product Name': order.productName,
            'Quantity': order.quantity,
            'Total': `₹${parseFloat(order.total.replace(/₹/, '').replace(/,/g, '')).toFixed(2)}`
        }));
        console.log("Order Details Sheet:", orderDetailsData); // Log the prepared order details sheet

        const orderDetailsSheet = XLSX.utils.json_to_sheet(orderDetailsData);
        XLSX.utils.book_append_sheet(wb, orderDetailsSheet, 'Order Details');

        // Write the workbook and send response
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        const filename = `Sales_Report_${Date.now()}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ message: 'Error generating Excel report', error: error.message });
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




















