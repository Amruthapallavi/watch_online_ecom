const passport = require('passport');
const userModel = require('./models/userModel');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();
require('./dbConfig/database');

const session= require("express-session");



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:8000/auth/google/callback",
  passReqToCallback: true // This passes the request to the callback
},
async function (req, accessToken, refreshToken, profile, done) { 
  try {
      console.log('Inside profile data');

      // Find the user by the Google ID
      const user = await userModel.findOne({ email: profile.emails[0].value }); // Find by email instead of googleId

      if (user) {
          // If user exists, proceed with the authentication
          return done(null, user);
      } else {
          // If user does not exist, fail the authentication
          return done(null, false, { message: 'User not found with this email...Please signUp' });
      }
  } catch (error) {
      console.log(error); 
      return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
      const user = await userModel.findById(id);
      done(null, user);
  } catch (err) {
      done(err, null);
  }
});







// async function(request, accessToken, refreshToken, profile, done){
//         return done(null,profile);

//     }

// ))