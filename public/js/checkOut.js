
   
document.querySelector('.place-order-btn').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission

    const addressSelected = document.querySelector('input[name="address"]:checked');
    const paymentSelected = document.querySelector('input[name="payment"]:checked');
    const totalAmount = document.getElementById('total').value;
    
    // Get coupon details
    const couponCode = document.querySelector('.coupon-input').value.trim() || null; // Get coupon code or set to null if not applied
    const couponDiscount = parseFloat(document.getElementById('discount').innerText) || 0; // Get discount amount or set to 0 if not applied

    if (!addressSelected) {
        swal("No Address Selected", "Please select a delivery address", "error");
        return;
    }

    if (!paymentSelected) {
        swal("No Payment Method Selected", "Please select a payment method", "error");
        return;
    }

    if (paymentSelected.value === 'COD' && totalAmount > 1000) {
        swal("COD Unavailable", "Cash on Delivery is not available for orders above ₹1000", "warning");
        return;
    }

    // Prepare form data with coupon details
    const formData = {
        address: addressSelected.value,
        payment: paymentSelected.value,
        total: totalAmount,
        couponCode: couponCode,        // Include coupon code (null if not applied)
        couponDiscount: couponDiscount  // Include discount (0 if not applied)
    };

    if (paymentSelected.value === 'razorpay') {
        fetch('/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            console.log('Razorpay Order Response:', data);
            if (data.success && data.order_id) {
                const options = {
                    key: data.key_id, 
                    amount: data.amount, 
                    currency: data.currency,
                    name: data.name,
                    description: data.description,
                    order_id: data.order_id, // Razorpay order ID
                    handler: function (response) {
                        // Verify payment
                        fetch('/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                address: addressSelected.value,
                                orderId: data.orderId,
                            })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                swal("Order Placed", `Your order has been placed successfully! Order ID: ${data.id}`, "success")
                                .then(() => {
                                    window.location.href = '/order-success'; // Redirect to order success page
                                });
                            } else {
                            swal("Payment Failed", "Payment verification failed. Your order status is pending.", "error")
                            .then(() => {
                                window.location.href = '/my-orders'; // Redirect to orders page
                            });
                        }
                    });
                },
                prefill: {
                    name: data.name,
                    email: data.email,
                    contact: data.contact
                },
                theme: {
                    color: '#F37254'
                },
                // If the payment modal is closed without completing the payment
                modal: {
                    ondismiss: function () {
                        // Redirect to the order-failed page
                        swal("Payment Incomplete", "You did not complete the payment. Your order could not be processed.", "error")
                        .then(() => {
                            window.location.href = '/order-failed'; // Redirect to order-failed page
                        });
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();
        }
        });
    } else if (paymentSelected.value === 'wallet') {
        fetch('/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                swal("Order Placed", `Your order has been placed successfully! Order ID: ${data.orderId}`, "success")
                .then(() => {
                    window.location.href = '/order-success'; 
                });
            } else {
                swal("Insufficient Balance", data.message || "There was an issue placing your order. Please try again.", "error");
            }
        });
    } else if (paymentSelected.value === 'COD') {
        fetch('/place-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                swal("Order Placed", `Your order has been placed successfully! `, "success")
                .then(() => {
                    window.location.href = '/order-success'; 
                });
            } else {
                swal("Order Failed", "There was an issue placing your order. Please try again.", "error");
            }
        });
    }
});

//coupon Order ID: ${data.orderId}


async function applyCoupon() {
    const couponCode = document.querySelector('.coupon-input').value;
    const grandTotal = parseFloat(document.getElementById('subtotal').innerText.replace('₹ ', '').replace(',', '')); // Get subtotal value

    if (!couponCode.trim()) {
        swal('Error', 'Please enter a coupon code.', 'error');
        return;
    }

    try {
        const response = await fetch('/apply-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ couponCode, grandTotal }) 
        });

        const data = await response.json();

        if (response.ok) {
            // Update the summary
            updateSummary(data.discountAmount, grandTotal, data.flat_rate); 

            document.getElementById('removeCouponBtn').style.display = 'inline-block';
            document.getElementById('applyCouponBtn').style.display = 'none';

            swal('Success', data.message, 'success');
        } else {
            swal('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        swal('Error', 'There was an issue applying the coupon. Please try again later.', 'error');
    }
}
function removeCoupon() {
    const discountAmount = 0; 
    const flatRate = 0; 

    const grandTotal = parseFloat(document.getElementById('subtotal').innerText.replace('₹ ', '').replace(',', '')); // Get the original subtotal value

    updateSummary(discountAmount, grandTotal, flatRate); 

    document.querySelector('.coupon-input').value = ''; 

    document.getElementById('removeCouponBtn').style.display = 'none'; 
    document.getElementById('applyCouponBtn').style.display = 'inline-block'; 

    swal('Success', 'Coupon has been removed.', 'success');
}



function updateSummary(discountAmount, grandTotal, flatRate) {
    const totalAmount = grandTotal - discountAmount + flatRate;

    document.getElementById('discount').innerText = discountAmount.toFixed(2);
    document.getElementById('totalAmount').innerText = totalAmount.toFixed(2);
    document.getElementById('total').value = totalAmount.toFixed(2); // Update hidden total input
}




    