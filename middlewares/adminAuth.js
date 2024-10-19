// adminAuthMiddleware.js

const adminAuthMiddleware = (req, res, next) => {
    if (req.session && req.session.admin==true) {
        return next();
    } else {
        req.session.error = 'You need to log in as an admin to access this page';
        return res.redirect('/admin'); 
    }
};

module.exports = adminAuthMiddleware;
