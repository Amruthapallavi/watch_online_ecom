const isLoggedIn = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/userHome'); // Redirect to homepage if logged in
    }
    next();
};



const isLoggedOut = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect('/userHome'); // Redirect to homepage if already logged in
    }
    next();
};

module.exports={
    isLoggedIn,
    isLoggedOut
};
