const nodemailer = require('nodemailer');

require('dotenv').config()

    const transporter = nodemailer.createTransport({
                    service:'gmail',
                    auth: {
                        user:process.env.USER_MAIL,
                        pass:process.env.NODEMAILER_PASS_KEY
                    }
                });



     function sendEmail(email){
        try {
            const randomotp = Math.floor(1000 + Math.random() * 9000);
          transporter.sendMail({
            to:email,
            from:process.env.USER_MAIL,
            subject:'otp verification',
            html:`<h1>dear user your OTP is ${randomotp}</h1>`


          })
          return randomotp;
        } catch (error) {
            console.log(error.message);
        }
     }

     const sendResetEmail = (user, resetToken) => {
      const mailOptions = {
        to: user.email,
        from: 'password-reset@yourdomain.com',
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested to reset your password.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://localhost:3000/reset/${resetToken}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
    
      return transporter.sendMail(mailOptions);
    };


     module.exports ={
        sendEmail,
        sendResetEmail 
     }