
 
function openAddForm() {
    document.getElementById("addCouponForm").style.display = "block";
}

function closeAddForm() {
    document.getElementById("addCouponForm").style.display = "none";
}


function openEditForm(id, code, value, expireAt, minPurchase, maxDiscount) {
// Populate form fields with the provided values
document.getElementById("edit-code").value = code;
document.getElementById("edit-value").value = value;
document.getElementById("edit-expireAt").value = expireAt;
document.getElementById("edit-min-purchase").value = minPurchase;
document.getElementById("edit-max-discount").value = maxDiscount;  // Pass maxDiscount value correctly

// Set the form action to the update route with the coupon ID
document.getElementById("edit-coupon-form").action = `/editCoupon/${id}`;

// Display the edit form
document.getElementById("editCouponForm").style.display = "block";
}

function closeEditForm() {
// Hide the edit form
document.getElementById("editCouponForm").style.display = "none";
}


function deleteCoupon(element) {
    event.preventDefault(); // Prevent the default link click behavior
    swal("Are you sure you want to delete this coupon?", {
        buttons: ["Cancel", "Delete"],
    }).then((isOkay) => {
        if (isOkay) {
            window.location.href = element.href;
        }
    });
}


// Function to validate coupon code and value before submitting
// function validateCouponCode(formType) {
//     const valueField = document.getElementById(`${formType}-value`);
//     const couponValue = parseInt(valueField.value, 10);

//     // Check if the value is greater than 99
//     if (couponValue > 99) {
//         swal("Error", "Coupon value cannot exceed 99%", "error");
//         return false; // Prevent form submission
//     }

//     return true;
// }

// Add validation to both add and edit forms
document.getElementById('add-coupon-form').onsubmit = function() {
    return validateCouponCode('add');
};

document.getElementById('edit-coupon-form').onsubmit = function() {
    return validateCouponCode('edit');
};
document.getElementById('add-coupon-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission
    

    const valueField = document.getElementById('add-value');
    const couponValue = parseInt(valueField.value, 10);
    const minPurchaseField = document.getElementById('min-purchase');
    const minPurchaseValue = parseFloat(minPurchaseField.value);
    const maxDiscountFields = document.getElementById('max-discount');

    const maxDiscount = parseFloat(maxDiscountFields.value);
    // Check if the coupon value is greater than 99
    if (couponValue > 99) {
        Swal.fire('Error', 'Coupon value cannot exceed 99%', 'error');
        return; // Stop further execution
    }
   //checking the max_value more than 0
   if (maxDiscount <= 0) {
        Swal.fire('Error', 'Max Discount value must be greater than 0', 'error');
        return; // Stop further execution
    }
   if (couponValue > 99) {
        Swal.fire('Error', 'Coupon value cannot exceed 99%', 'error');
        return; // Stop further execution
    }

    // Check if the minimum purchase value is 0
    if (minPurchaseValue <= 0) {
        Swal.fire('Error', 'Minimum purchase must be greater than 0', 'error');
        return; // Stop further execution
    }
    const formData = new FormData(this);
    const formObj = {};
    formData.forEach((value, key) => formObj[key] = value);

    try {
        const response = await fetch('/addCoupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formObj),
        });

        const data = await response.json();
        if (response.ok) {
            // Show success message
            Swal.fire('Success', data.message, 'success');
            // Optionally refresh the coupon list or redirect
            setTimeout(() => {
                window.location.reload(); // Refresh the page after successful addition
            }, 1500);
        } else {
            // Show error message
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'An unexpected error occurred!', 'error');
    }
});

function openAddForm() {
    document.getElementById('addCouponForm').style.display = 'block';
}

function closeAddForm() {
    document.getElementById('addCouponForm').style.display = 'none';
}

//edit coupon

document.getElementById('edit-coupon-form').addEventListener('submit', async function(event) {
event.preventDefault(); // Prevent default form submission

const valueField = document.getElementById('edit-value');
const couponValue = parseInt(valueField.value, 10);
const minPurchaseField = document.getElementById('edit-min-purchase');
const minPurchaseValue = parseFloat(minPurchaseField.value);

// Check if the coupon value is greater than 99
if (couponValue > 99) {
    Swal.fire('Error', 'Coupon value cannot exceed 99%', 'error');
    return; // Stop further execution
}

// Check if the minimum purchase value is 0
if (minPurchaseValue <= 0) {
    Swal.fire('Error', 'Minimum purchase must be greater than 0', 'error');
    return; // Stop further execution
}

const formData = new FormData(this);
const formObj = {};
formData.forEach((value, key) => formObj[key] = value);

try {
    const response = await fetch(this.action, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formObj),
    });

    const data = await response.json();
    if (response.ok) {
        // Show success message
        Swal.fire('Success', data.message, 'success');
        // Optionally refresh the coupon list or redirect
        setTimeout(() => {
            window.location.reload(); // Refresh the page after successful update
        }, 1500);
    } else {
        // Show error message
        Swal.fire('Error', data.message, 'error');
    }
} catch (error) {
    console.error('Error:', error);
    Swal.fire('Error', 'An unexpected error occurred!', 'error');
}
});


  