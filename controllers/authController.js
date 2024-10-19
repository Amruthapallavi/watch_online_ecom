const userModel = require("../models/userModel");
const adminModel = require("../models/adminModel");
const productModel = require('../models/productModel');
const bcrypt = require("bcrypt");
const flash = require('connect-flash');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const {generateHash,generateResetToken,validPassword} = require('../models/userModel')
const session = require('express-session');
const nodemailer= require('nodemailer');
const sendEmail= require('../helpers/nodemailer');

const getHome = (req,res)=>{
    try {
        res.render("user/welcome")
    } catch (error) {
        console.log(error.message);
    }
}
const getUserLogin = (req,res)=>{
    try {
        res.set('Cache-Control', 'no-store');
        const message= req.session.message;
        res.render("auth/userLogin",{
            title:'user_login',
            message,
           
            
        });
    } catch (error) {
        console.log(error.message);
    }
}
const getUserSignup = (req,res)=>{
    try {
        res.set('Cache-Control', 'no-store');
        res.render("auth/userSignup");
    } catch (error) {
        console.log(error.message);
    }
}

const securePassword = async(password)=>{
    try {
     const hashPassword=  await bcrypt.hash(password,10);
     return hashPassword;

    } catch (error) {
        console.log(error.message);

    }
}

const checkUniqueEmail = async(req,res,next)=>{
    const {email} = req.body;
    req.session.userData=email;
    console.log(email);
    try {
        const existingUser = await userModel.findOne({ email});
        if(existingUser){
            res.render('auth/userSignup',{message : "Email already exists"})
        }else{
            next()
        }
    } catch (error) {
        console.log(error.message);
    }
}

const checkUniqueMobile = async (req,res,next)=>{
   const {phone} = req.body;
   try {
     const existingUser = await userModel.findOne({phone});

     if(existingUser){

        res.render('auth/userSignup',{message:'Mobile Number already exists'})
     }else{
        next();
     }
   } catch (error) {
    console.log(error.message);
   }
}
const doUserSignup= async(req,res)=>{
 
    try {
        const userExists = await userModel.findOne({email:req.body.email});
        // req.session.userData=req.body.email;
        if(userExists){
            req.session.message = 'user already exists please login'
            res.redirect('/signup');
           
        }else{
            req.session.userData = req.body;
            const otp= sendEmail.sendEmail(req.body.email)
            console.log(otp);
            req.session.otp = otp;
            res.redirect('/verifyotp');
        }
    } catch (error) {
      console.log(error.message);  
    }
}
const loadotp= async (req,res)=>{
    try {
        res.render('auth/verifyotp');
        // console.log(req.session.userData);
    } catch (error) {
        console.log(error.message);
    }
}
// const sendOtp = async (req,res)=>{
//     const { email } = req.body;
//     async function sendOtp(email) {
        
    
//         const randomotp = Math.floor(1000 + Math.random() * 9000);
//         console.log(randomotp);
//         const transporter = nodemailer.createTransport({
//             service:'gmail',
//             auth: {
//                 user:process.env.USER_MAIL,
//                 pass:process.env.NODEMAILER_PASS_KEY
//             }
//         });

//         const mailOptions= {
//             from :process.env.USER_MAIL,
//             to:email,
//             subject:'Email Verification',
//             text:`your verification OTP is ${randomotp}`
//         };
        
        
      
    
//         try {
//             let info = await transporter.sendMail(mailOptions);
//             console.log('OTP sent: %s', info.messageId);
//         } catch (error) {
//             console.error('Error sending OTP:', error);
//         }
//     }
    
//     sendOtp();


//         // req.session.otp = randomotp

//         console.log(req.session.otp)
//         setTimeout(() => {
//             console.log('session ended')
//         }, 30000);

//         req.session.otpTime = Date.now()

//         res.render('auth/verifyotp', { message: '' })
//     } 
        
const resendOtp= (req, res) => {
    console.log(req.session.userData);

    // const otp= sendEmail.sendEmail(req.body.email)
    // req.session.message = "otp has resend to the registered email";
    // req.session.otp = otp;
    // res.redirect("/verifyOTP");
  }

  const crypto = require('crypto');

  const verifyOtp = async (req, res) => {
      try {
          const data = req.session.userData;
          const hashedPassword = await bcrypt.hash(data.password, 10);
          const { otp } = req.body; // Extract OTP from the request body
  
          if (req.session.otp === Number(otp)) {
              // Generate a unique referral code
              const referralCode = generateUniqueReferralCode();
  
              // Insert the new user into the database with the referral code
              await userModel.collection.insertOne({
                  name: data.name,
                  email: data.email,
                  phone: data.phone,
                  password: hashedPassword,
                  is_active: true,
                  referralCode: referralCode // Save the generated referral code
              });
  
              res.redirect('/login');
          }
      } catch (error) {
          console.log(error.message);
          res.redirect('/500');
      }
  }
  
  const generateUniqueReferralCode = () => {
      return crypto.randomBytes(4).toString('hex').toUpperCase(); 
  }
  

const doUserLogin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        const userData = await userModel.findOne({ email: email });
        
        if (userData) {
            if (userData.is_active === true && userData.is_admin === false) {
                
                const passwordMatch = await bcrypt.compare(password, userData.password);
                
                if (passwordMatch) {
                    const products = await productModel.find();
                    
                    const payload = { userData };
                    const token = jwt.sign(payload, 'secretKey', { expiresIn: "24h" });

                    res.cookie("UserToken", token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: "strict",
                    });
                    
                    req.session.isLoggedIn = true;
                    req.session.user_id = userData._id;

                    res.redirect('/userHome');
                } else {
                    res.render('auth/userLogin', { message: 'Invalid credentials' });
                }
            } else {
                res.render('auth/userLogin', { message: 'You are currently blocked' });
            }
        } else {
            res.render('auth/userLogin', { message: 'Invalid credentials' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).render('auth/userLogin', { message: 'An error occurred. Please try again.' });
    }
};


const getAdminLogin = (req, res) => {
    res.render("auth/adminLogin", {
      title: "Admin login",
      error: req.session.error,
    });
    req.session.error = "";
  }


  
  const doAdminLogin = async (req, res) => {
      try {
          const email = req.body.email;
          const password = req.body.password;
  
          if (!email || !password) {
              req.session.loginError = 'Email and password are required';
              return res.redirect('/admin'); // Redirect to the login page
          }
  
          const adminData = await userModel.findOne({ email: email });
  
          if (adminData && adminData.is_admin) {
              const isPasswordValid = await bcrypt.compare(password, adminData.password);
  
            
  
              if (isPasswordValid) {
                  req.session.admin = true; 
                  req.session.loginError = null; 
                  return res.redirect('/adminHome'); 
              } else {
                  req.session.loginError = 'Invalid credentials'; 
              }
          } else {
              req.session.loginError = 'Invalid credentials';
          }
  
          // Render the login page with the session data
          return res.render('auth/adminLogin', { error: req.session.loginError, title: 'admin_login' }); // Pass the error directly
      } catch (error) {
          console.log(error);
          req.session.loginError = 'An error occurred during login'; // General error message
          return res.render('auth/adminLogin', { error: req.session.loginError, title: 'admin_login' }); // Pass the error directly
      }
  };
  
  
const userLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.redirect('/userHome');
        }
        res.clearCookie('UserToken');
        res.redirect('/login'); 
    });
};

const adminLogout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('Error destroying session:', err);
            return res.redirect('/admin'); // Redirect to admin page in case of an error
        }
        
        res.redirect('/admin');
    });
};




const successGoogleLogin = (req , res) => { 
	if(!req.user) 
		res.redirect('/failure'); 
    console.log(req.user);
	res.render('user/userHome',{
        title:'user_home'
    }) 
}

const failureGoogleLogin = (req , res) => { 
	res.send("Error"); 
}


const getForgotPass = async (req,res)=>{
    try {
        res.render('auth/forgotPass',{
            title:'forgot_password',
            error:req.session.error,
        });
    } catch (error) {
        console.log(error.message);
    }
}
const getResetPass = async (req,res)=>{
try {
    res.render('auth/resetPass');

} catch (error) {
    console.log(error.message);
}
}




const postForgotPass= async (req,res)=>{
    
    const { email } = req.body;
  console.log(email);
  try {
    const isUser = await userModel.collection.findOne({ email:email });
    if (isUser) {
        req.session.forgotPass = email;
        // console.log(req.session.forgotPass);
        const otp = sendEmail.sendEmail(email);
        req.session.otp = otp;
        console.log(otp);
        res.redirect("/getOtpPage");
      } else {
        res.render("auth/forgotPass",{
            error:'User not exists'
        });
      }
    }catch{
        console.log(error.message);
    }}

const getOtpPage = async (req,res)=>{
    try {
        res.render('auth/otpSub',{
            error:req.session.error,
        });
    } catch (error) {
        console.log(error.message);
    }
}
const getNewPassword= (req, res) => {
    res.render("auth/newPassword", { title: "Change password" });
  }
const doNewPasswordOtp= async (req, res) => {
    console.log(req.body.otp);
    console.log(req.session.otp);
    if (req.session.otp == req.body.otp) {
      res.redirect("/newPass");
    } else {
      req.session.error=( "Invalid OTP");
      res.redirect("/getotpPage");
    }
  }
// const resetPassword = async (req,res)=>{
//     const { token } = req.params;
//   const { password } = req.body;
//    console.log(token);
//   try {
//     const user = await userModel.findOne({
//       resetPasswordToken: token,
//       resetPasswordExpires: { $gt: Date.now() }
//     });
//     if (!user) return res.status(400).send('Password reset token is invalid or has expired.');

//     user.password = user.generateHash(password);
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;

//     await user.save();

//     res.status(200).send('Password has been reset.');
//   } catch (err) {
//     res.status(500).send('Error processing request.');
//   }
// }
// const doNewPassword=async (req, res) => {
//     try {
//       console.log(req.body);
//       const password = req.body.password;
//       const hashedPassword = await bcrypt.hash(password, 10);
//       const email = req.session.forgotPass;
//       await userModel.collection.updateOne(
//         { email: email },
//         { $set: { password: hashedPassword } }
//       );
//       res.redirect("/login");
//     } catch (error) {
//       console.log(error);
//     }
//   }
 const doNewPassword = async (req,res)=>{
    try {
        console.log(req.body);
        const password = req.body.password;
        const hashedPassword = await bcrypt.hash(password, 10);
        const email = req.session.forgotPass;
        console.log(email);
       await userModel.collection.updateOne(
          { email: email },
          { $set: { password: hashedPassword } }
        );
        res.redirect("/login");
      } catch (error) {
        console.log(error);
      }
    }
       
 
module.exports ={
    getHome,
    getUserLogin,
    getUserSignup,
    checkUniqueEmail,
    checkUniqueMobile,
    doUserLogin,
    doUserSignup,
    loadotp,
    resendOtp,
    verifyOtp,
    getAdminLogin,
    doAdminLogin,
    userLogout,
    getOtpPage,
    getNewPassword,
    adminLogout,
    successGoogleLogin,
    failureGoogleLogin,
    getForgotPass,
getResetPass,
postForgotPass,
doNewPasswordOtp,
doNewPassword,
// resetPassword



}















// const doAdminLogin = async (req, res) => {
//     try {
//       const { email, password } = req.body;
//       console.log(req.body);
//       const isAdmin = await adminModel.collection.findOne({ email: email });

//       if (isAdmin.email === email && isAdmin.password === password) {
//         console.log(isAdmin.password, isAdmin.email);
//         res.redirect("/adminHome"); 
//     } else {
//         req.session.error = "Invalid Email or Password";
//         res.redirect("/admin");
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   }