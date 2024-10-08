const orderModel = require("../models/orderModel");
const pdf = require('html-pdf');
const path = require('path');

const downloadInvoice = async (req, res) => {
    console.log('Request received:', req.body);
    
    // Extract order and user details from the request body
    const { order, user, address } = req.body;

    if (!order || !user) {
        return res.status(400).json({ error: 'Order or user information is missing.' });
    }

    // Prepare the HTML for the PDF using EJS
    const htmlContent = `
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; line-height: 1.6; color: #333; background-color: #f4f4f4; }
            h2 { text-align: center; color: #4CAF50; letter-spacing: 1.5px; }
            p, td, th { margin: 5px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #fff; }
            th, td { border: 1px solid #ddd; padding: 12px 15px; text-align: center; }
            th { background-color: #f0f0f0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; }
            footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
            .summary { margin-top: 30px; width: 100%; }
            .summary td { padding: 10px; }
            .total-row { font-weight: bold; background-color: #f0f0f0; font-size: 16px; }
            .company-name { font-size: 18px; font-weight: bold; color: #333; letter-spacing: 0.5px; }
            .highlight { background-color: #e8f5e9; font-weight: bold; color: #388e3c; }
        </style>
    </head>
    <body>
        <h2>Invoice</h2>
        <p><strong>Order ID:</strong> ${order.orderId}</p>
        <p><strong>Customer Name:</strong> ${user.name}</p>
        <p><strong>Customer Email:</strong> ${user.email}</p>
        <p><strong>Order Date:</strong> ${new Date(order.placedAt).toLocaleString()}</p>
        <p><strong>Delivery Address:</strong> H.No: ${address.house_no}, ${address.street}, ${address.city}, ${address.district} </p><p> ${address.state}, ${address.pincode}</p>
        
        <table>
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Price (₹)</th>
                    <th>Offer Price (₹)</th>
                    <th>Quantity</th>
                    <th>Total (₹)</th>
                </tr>
            </thead>
            <tbody>
                ${order.products.map(product => `
                    <tr>
                        <td>${product.pname}</td>
                        <td>₹${product.price.toFixed(2)}</td>
                        <td>₹${(product.price - parseFloat(order.offerDiscount || 0)).toFixed(2)}</td>
                        <td>${product.quantity}</td>
                        <td>₹${(product.price * product.quantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <table class="summary">
            <tr>
                <td><strong>Subtotal:</strong></td>
                <td>₹${(order.grandTotal - order.deliveryCharges).toFixed(2)}</td>
            </tr>
            <tr>
                <td><strong>Delivery Charges:</strong></td>
                <td>₹${order.deliveryCharges.toFixed(2)}</td>
            </tr>
            <tr>
                <td><strong>Coupon Applied:</strong></td>
                <td>${order.couponApplied}</td>
            </tr>
            <tr class="total-row">
                <td><strong>Total Amount:</strong></td>
                <td>₹${order.grandTotal.toFixed(2)}</td>
            </tr>
        </table>

        <footer>
            <p class="company-name">Tick-Track</p>
            <p>123, Business Street, City Name, 560001</p>
            <p>&copy; ${new Date().getFullYear()} Tick-Track. All rights reserved.</p>
        </footer>
    </body>
    </html>
    `;

    // Convert the HTML to a PDF
    pdf.create(htmlContent).toFile(path.join(__dirname, '../invoices', `${order.orderId}.pdf`), (err, result) => {
        if (err) return res.status(500).send(err);

        // Send the generated PDF file
        res.sendFile(result.filename);
    });
};

module.exports = {
    downloadInvoice,
};
