
  
const flatRate = parseFloat('<%= flat_rate %>');
document.querySelectorAll('.quantity').forEach(container => {
    container.addEventListener('click', function (event) {
        const target = event.target;
        if (target.classList.contains('decrement') || target.classList.contains('increment')) {
            const productId = target.getAttribute('data-id');
            const quantityInput = document.getElementById(`quantity-${productId}`);
            let quantity = parseInt(quantityInput.value);
            const maxStock = parseInt(document.getElementById(`product-${productId}`).dataset.stock); // Get stock
            const maxLimit = maxStock > 5 ? 5 : maxStock; // Set limit to 5 if stock is greater than 5, otherwise use available stock

            if (target.classList.contains('decrement')) {
                quantity = Math.max(quantity - 1, 1); // Prevent quantity from going below 1
            } else if (target.classList.contains('increment')) {
                if (quantity < maxLimit) {
                    quantity += 1; // Increase quantity if below max limit
                } else {
                    // Show SweetAlert message when the user reaches the max limit
                    swal('Maximum Limit', `You have reached the maximum allowed quantity for this product (${maxLimit}).`, 'warning');
                }
            }

            // Update quantity input value
            quantityInput.value = quantity;

            // Update total for this product and the overall cart totals
            updateTotal(productId, quantity);
            updateCartTotals();
            updateHiddenQuantityInput(productId, quantity); // Update hidden input
        }
    });
});

function updateTotal(productId, quantity) {
    const offerPrice = parseFloat(document.querySelector(`#product-${productId} .offer-price`).innerText.replace('₹', ''));
    const totalElement = document.getElementById(`total-${productId}`);
    const newTotal = offerPrice * quantity;

    totalElement.innerText = newTotal.toFixed(2);
}

function updateCartTotals() {
    let subtotal = 0;

    document.querySelectorAll('tbody tr').forEach(row => {
        const total = parseFloat(row.querySelector('.total-price').innerText);
        subtotal += total;
    });

    // Update subtotal and grand total
    document.getElementById('subtotal').innerText = subtotal.toFixed(2);
    const grandTotal = subtotal + flatRate;
    document.getElementById('grandTotal').innerText = subtotal.toFixed(2);
}

// Function to update the hidden input for quantities
function updateHiddenQuantityInput(productId, quantity) {
    const hiddenQuantityInput = document.getElementById(`quantity-hidden-${productId}`);
    if (hiddenQuantityInput) {
        hiddenQuantityInput.value = quantity;
    }
}
document.getElementById('checkout-form').addEventListener('submit', function () {
    // Update hidden input fields with current totals
    document.getElementById('hidden-subtotal').value = document.getElementById('subtotal').innerText;
    document.getElementById('hidden-flat-rate').value = document.getElementById('flatRate').innerText;
    
    // Update grand total by adding flat_rate and subtracting the discount
    const grandTotal = parseFloat(document.getElementById('subtotal').innerText);
    const flatRate = parseFloat(document.getElementById('flatRate').innerText);
    const discount = parseFloat(document.getElementById('discount').innerText);

    const finalGrandTotal = (grandTotal + flatRate - discount).toFixed(2);

    // Update the hidden grand total input field
    document.getElementById('hidden-grand-total').value = finalGrandTotal;
});

function confirmRemoveItem(button) {
    const form = button.closest('.remove-item-form'); // Get the form containing the button

    // Show SweetAlert confirmation
    swal({
        title: "Are you sure?",
        text: "Do you want to remove this item from Cart?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
    .then(async (willRemove) => {
        if (willRemove) {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': '{{ csrfToken }}' // Include CSRF token if necessary
                },
                body: JSON.stringify({}),
            });

            const data = await response.json();

            if (data.success) {
                // Show success message
                swal("Success", data.message, "success").then(() => {
                    // Redirect to cart page after the success message is acknowledged
                    window.location.href = '/cart';
                });
            } else {
                // Show error message
                swal("Error", data.message, "error");
            }
        } else {
            swal("Your item is safe!"); // Optionally inform the user
        }
    });
}

    
//     async function applyCoupon() {
//     const couponCode = document.querySelector('.coupon-input').value;

//     // If the coupon code is empty, show an error
//     if (!couponCode.trim()) {
//         swal('Error', 'Please enter a coupon code.', 'error');
//         return;
//     }

//     // Prepare the product data to send
//     const cartProducts = [...document.querySelectorAll('tbody tr')].map(row => ({
//         productId: row.id.split('-')[1],
//         category: row.dataset.category, // Assuming you have the category in data attributes
//         price: parseFloat(row.querySelector('td:nth-child(2)').innerText.replace('₹', '')),
//         quantity: parseInt(row.querySelector('td:nth-child(3) input').value)
//     }));

//     try {
//         const response = await fetch('/apply-coupon', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ couponCode, products: cartProducts }) // Send data as JSON
//         });

//         const data = await response.json();

//         if (response.ok) {
//             // Update discount and grand total on the frontend
//             document.getElementById('discount').innerText = data.discountAmount.toFixed(2);
//             document.getElementById('grandTotal').innerText = data.grandTotal.toFixed(2);

//             // Update hidden input for coupon discount
//             document.getElementById('hidden-coupon-discount').value = data.discountAmount.toFixed(2);

//             // Show Remove Coupon button and hide Apply Coupon button
//             document.getElementById('removeCouponBtn').style.display = 'inline-block'; // Change visibility
//             document.getElementById('applyCouponBtn').style.display = 'none'; // Hide apply button

//             swal('Success', data.message, 'success');
//         } else {
//             swal('Error', data.message, 'error');
//         }
//     } catch (error) {
//         console.error('Error applying coupon:', error);
//         swal('Error', 'There was an issue applying the coupon. Please try again later.', 'error');
//     }
// }

// function removeCoupon() {
//     // Reset the discount and update the grand total
//     document.getElementById('discount').innerText = '0.00';
//     updateCartTotals();

//     // Reset hidden coupon discount input
//     document.getElementById('hidden-coupon-discount').value = '0.00';

//     // Hide Remove Coupon button and show Apply Coupon button again
//     document.getElementById('removeCouponBtn').style.display = 'none'; // Hide remove button
//     document.getElementById('applyCouponBtn').style.display = 'inline-block'; // Show apply button

//     swal('Success', 'Coupon has been removed.', 'success');
// }

   