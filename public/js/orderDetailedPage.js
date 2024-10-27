 
   
    // Event listener for Return buttons
    document.querySelectorAll('.return-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productItem = this.closest('.product-item');
            const productId = productItem.querySelector('.product-checkbox').value;

            // Show the return reason form and store the selected product ID
            document.getElementById('returnReasonForm').style.display = 'block';
            document.getElementById('returnProductId').value = productId; // Store the productId in the hidden input
        });
    });

    document.getElementById('returnReasonSelection').addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default form submission

        const selectedReason = this.reason.value; // Get selected reason
        const orderId = document.getElementById('returnOrderId').value; // Get the order ID
        const productId = document.getElementById('returnProductId').value; // Get the product ID from the hidden input

        // Show confirmation popup
        Swal.fire({
            title: 'Are you sure you want to return this order?',
            text: "Reason: " + selectedReason,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, return it!',
            cancelButtonText: 'No, keep it'
        }).then((result) => {
            if (result.isConfirmed) {
                // Proceed with the return process using POST request
                fetch('/return-product', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        orderId: orderId, 
                        productId: productId, // Include product ID in the body
                        reason: selectedReason 
                    }) // Send orderId, productId, and reason as part of the request body
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Done!', 'Your return request has been sent.', 'success')
                            .then(() => {
                                location.reload(); // Reload the page to reflect changes
                            });
                    } else {
                        Swal.fire('Error!', 'There was an error processing your return.', 'error');
                    }
                })
                .catch(err => {
                    Swal.fire('Error!', 'An unexpected error occurred.', 'error');
                    console.error('Return Error:', err);
                });
            }
        });
    });
   

  
    


   
    document.getElementById('downloadInvoiceBtn').addEventListener('click', function() {
        // Get order details to send to the backend
        const orderData = {
            order: {
                orderId: '<%= order.paymentDetails.orderId %>',
                placedAt: '<%= order.placedAt %>',
                products: <%- JSON.stringify(order.products.filter(product => product.productOrderStatus !== 'Cancelled' && product.productOrderStatus !== 'Return')) %>, // Exclude canceled and returned products
                grandTotal: <%= order.grandTotal %>, // This should reflect the total amount excluding any canceled or returned products
                deliveryCharges: 0, // Set delivery charges to 0
                couponApplied: '<%= order.couponDiscount || "No Coupon Applied" %>',
                offerDiscount: '<%= Number(order.offerDiscount) || 0 %>'
            },
            user: {
                name: '<%= user.name %>',
                email: '<%= user.email %>'
            },
            address: {
                street: '<%= order.deliveryAddress.street %>',
                house_no: '<%= order.deliveryAddress.house_no %>',
                city: '<%= order.deliveryAddress.city %>',
                pincode: '<%= order.deliveryAddress.pincode %>',
                district: '<%= order.deliveryAddress.district %>',
                state: '<%= order.deliveryAddress.state %>'
            }
        };

        // Send a POST request to download the invoice
        fetch('/download-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob(); // Get the PDF as a Blob
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice_${orderData.order.orderId}.pdf`; // Set the filename for the download
            document.body.appendChild(a);
            a.click();
            a.remove(); // Remove the anchor element after clicking
        })
        .catch(error => {
            Swal.fire('Error!', 'There was an error downloading the invoice. Please try again.', 'error');
            console.error('Error downloading invoice:', error);
        });
    });
   



   
    // Retry Payment Handler
    document.getElementById('retryPaymentBtn').addEventListener('click', function() {
        Swal.fire({
            title: 'Retry Payment?',
            text: "Are you sure you want to retry the payment?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, retry!',
            cancelButtonText: 'No, cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Call the backend to get Razorpay order details
                fetch('/retry-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId: '<%= order.orderId %>' })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Initialize Razorpay with the new order details
                        var options = {
                            "key": "rzp_test_AnrHnaf2vgMvpI", // Razorpay API key from the backend
                            "amount": data.amount, // Amount in paise
                            "currency": data.currency,
                            "name": "Tick-Track",
                            "description": "Order Payment",
                            "order_id": data.orderId, // Razorpay Order ID from the backend
                            "handler": function(response) {
                                // Handle successful payment verification
                                fetch('/verify-payment', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_signature: response.razorpay_signature,
                                        orderId: '<%= order.orderId %>',
                                    })
                                })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        Swal.fire('Success!', 'Payment verified successfully!', 'success')
                                            .then(() => {
                                                location.reload(); // Reload the page after success
                                            });
                                    } else {
                                        Swal.fire('Error!', data.message || 'Payment verification failed.', 'error');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error during verification:', error);
                                    Swal.fire('Error!', 'Payment verification failed. Please try again.', 'error');
                                });
                            },
                            "prefill": {
                                "name": "<%= user.name %>",
                                "email": "<%= user.email %>",
                                "contact": "<%= user.phone %>"
                            },
                            "theme": {
                                "color": "#3399cc"
                            }
                        };

                        var rzp1 = new Razorpay(options);
                        rzp1.open(); // Open the Razorpay checkout modal
                    } else {
                        Swal.fire('Error!', 'Unable to initiate the payment process. Please try again later.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error initiating payment:', error);
                    Swal.fire('Error!', 'There was an issue retrying the payment. Please try again.', 'error');
                });
            }
        });
    });
   

    
   
    // Add event listeners to all cancel buttons
    document.querySelectorAll('.cancel-product-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            toggleCheckboxes(productId); // Show product checkboxes
            document.getElementById('cancelReasonForm').style.display = 'block'; // Show the reason form
        });
    });

    // Handle cancellation form submission
    document.getElementById('reasonSelection').addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent form submission

        const selectedReason = this.reason.value; // Get selected reason
        const orderId = '<%= order.orderId %>'; // Ensure this is the correct way to get the order ID

        // Check if at least one product is selected
        const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked')).map(checkbox => checkbox.value); // Get selected product IDs
        if (selectedProducts.length === 0) {
            Swal.fire('Error!', 'Please select at least one product to cancel.', 'error');
            return;
        }

        // Show confirmation popup
        Swal.fire({
            title: 'Are you sure you want to cancel this product?',
            text: "Reason: " + selectedReason + "\nSelected Products: " + selectedProducts.join(", "),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it!',
            cancelButtonText: 'No, keep it'
        }).then((result) => {
            if (result.isConfirmed) {
                // Proceed with the cancellation
                fetch('/cancel-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ orderId, productIds: selectedProducts, reason: selectedReason }) // Send orderId, productIds, and reason
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Done!', 'Your product cancellation request has been sent.', 'success')
                            .then(() => {
                                location.reload(); // Reload the page to reflect the changes
                            });
                    } else {
                        Swal.fire('Error!', 'There was an error cancelling your product.', 'error');
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                    Swal.fire('Error!', 'There was an error cancelling your product.', 'error');
                });
            }
        });
    });

    // Function to toggle checkboxes
    function toggleCheckboxes(productId) {
        document.querySelectorAll(`.product-checkbox[value="${productId}"]`).forEach(checkbox => {
            checkbox.checked = true; // Automatically check the box for the selected product
        });
    }
   

   
 // Function to confirm cancellation of the order
function confirmCancelOrder(orderId) {
    // Show confirmation dialog using SweetAlert
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to cancel this order?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, cancel it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // If confirmed, proceed to cancel the order
            cancelOrder(orderId);
        }
    });
}

async function cancelOrder(orderId) {
    try {
        const response = await fetch(`/cancel-order/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}), // Sending an empty body as no reason is required
        });

        if (response.ok) {
            Swal.fire('Cancelled!', 'Your order has been cancelled.', 'success');
            location.reload(); // Reloads the current page
        } else {
            Swal.fire('Error!', 'Failed to cancel the order. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        Swal.fire('Error!', 'Failed to cancel the order. Please try again.', 'error');
    }
}

   