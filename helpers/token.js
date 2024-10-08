const jwt = require('jsonwebtoken');

const tokenVerification = (token)=>{
    const result = jwt.verify(token,'secretKey');
    const userData= result.userData;
    return userData;

}

module.exports = tokenVerification;