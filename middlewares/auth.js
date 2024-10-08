const jwt = require('jsonwebtoken');
const User = require('../models/userModel'); // Adjust the path based on your project structure

require('dotenv').config();

const authMiddleware = async(req,res,next)=>{
    try {
      const userId = req.session.user_id;
        const token = req.cookies.UserToken;
        
        if(!token ){
          req.session.message="You are currently Blocked";
            return res.redirect('/login');
        }
        jwt.verify(token,'secretKey',(error,decoded)=>{
          if(error){
            return res.redirect('/login');
          }
          next();
        });
    } catch (error) {
        console.log(error.message);
    }
}
module.exports = authMiddleware;
