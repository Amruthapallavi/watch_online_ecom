const cartModel = require('../models/cartModel');

// Function to handle quantity update
exports.updateQuantity = async (req, res) => {
    try {
        const productId = req.params.id;
        const newQuantity = req.body.quantity;
        const token = req.cookies.UserToken;
        const userData = tokenVerification(token);
        const userId = new ObjectId(userData._id);

        // Update the quantity of the product in the cart
        const updatedCart = await cartModel.updateOne(
            { userId: userId, 'products.productId': productId },
            { $set: { 'products.$.quantity': newQuantity } }
        );

        if (updatedCart.modifiedCount > 0) {
            res.json({ success: true, message: 'Quantity updated successfully' });
        } else {
            res.json({ success: false, message: 'Failed to update quantity' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
