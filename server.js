const express= require("express");
const session= require("express-session");
require('./dbConfig/database');
require('./passport');
const ejs= require("ejs");
const app=express();
const passport = require('passport');
const cookieParser = require('cookie-parser');
const methodOverride= require("method-override");
const path= require('path');
const multer= require('multer');
const flash = require('connect-flash');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const { body, validationResult } = require('express-validator');
// const logger=require('morgan')
app.use(cookieParser());
const bodyParser= require("body-parser");
require('dotenv').config();
const cors = require('cors');
app.use(cors({
    origin: 'http://your-frontend-domain.com', // Replace with your frontend URL
    methods: ['POST', 'GET'],
    credentials: true // If you are sending cookies or using sessions
}));

const userRouter= require('./routes/userRoutes');
const adminRouter = require('./routes/adminRoutes');
const authRouter = require('./routes/auth');
app.use(express.urlencoded({extended:true}));

  app.use(session({
    secret:process.env.SESSION_SECRET_KEY, // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
}));
// app.use(logger('dev'));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Cache-Control', 'post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});
app.set('view engine','ejs');


app.use('/',userRouter);
app.use('/',authRouter);
app.use('/',adminRouter);
app.use(express.json());

//for the static files.h
app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(path.join(__dirname, 'uploadedImages')));

app.get('*', (req, res) => {
  res.status(404).render('user/404'); // Renders the 404 page
});

app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error for debugging
  res.status(500).render('user/500'); // Renders the 500 page
});
app.use(passport.initialize());
app.use(passport.session());










const PORT= 8000;
app.listen(PORT,()=> console.log(`server is running on PORT ${PORT}`));