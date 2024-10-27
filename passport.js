const passport = require('passport');
const userModel = require('./models/userModel');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();
require('./dbConfig/database');
const session = require("express-session");

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:8000/auth/google/callback",
  passReqToCallback: true // This passes the request to the callback
},
async function (req, accessToken, refreshToken, profile, done) { 
  try {

      const user = await userModel.findOne({ email: profile.emails[0].value });

      if (user) {
          return done(null, user);
      } else {
          const newUser = await userModel.create({
              googleId: profile.id, // Save the Google ID for later use
              email: profile.emails[0].value,
              name: profile.displayName, // Save additional user info if needed
          });

          return done(null, newUser); // Pass the newly created user to done
      }
  } catch (error) {
      console.error('Error during authentication:', error); 
      return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id); // Use the user's ID to serialize
});

passport.deserializeUser(async (id, done) => {
  try {
      const user = await userModel.findById(id);
      done(null, user); // Deserialize the user
  } catch (err) {
      console.error('Error during deserialization:', err); 
      done(err, null);
  }
});

// Export passport for use in your application
module.exports = passport;
