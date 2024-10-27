
   
// Automatically move to the next input box on key press
const otpInputs = document.querySelectorAll('.otp-input input');

otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

// Toggle between see and hide OTP
const toggleBtn = document.getElementById('toggleOtp');
const eyeIcon = document.getElementById('eye-icon');
let isPasswordHidden = true;

toggleBtn.addEventListener('click', () => {
    isPasswordHidden = !isPasswordHidden;
    otpInputs.forEach(input => {
        input.type = isPasswordHidden ? 'password' : 'text';
    });
    eyeIcon.textContent = isPasswordHidden ? '👁️' : '👁️‍🗨️'; // Change eye icon accordingly
});

// SweetAlert for empty fields and incorrect OTP
document.getElementById('otpForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent form submission for validation

    // Gather OTP inputs
    let otp = '';
    otpInputs.forEach(input => {
        otp += input.value;
    });

    // Validate if all OTP fields are filled
    if (otp.length < 4) {
        Swal.fire({
            icon: 'warning',
            title: 'Incomplete OTP',
            text: 'Please enter all 4 digits of the OTP!',
        }).then(() => {
            // Clear OTP inputs
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus(); // Set focus back to the first input
        });
        return;
    }

    // Perform an AJAX request to verify the OTP with the backend
    try {
        const response = await fetch('/postotp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ otp }), // Send the OTP as JSON
        });

        // Check if the response is ok (status 200)
        if (!response.ok) {
            // Handle server-side error response
            const errorData = await response.json();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorData.message || 'An error occurred while verifying the OTP. Please try again.',
            });
            return;
        }

        // Parse the JSON response from the server
        const result = await response.json();

        // Redirect to login if verification is successful
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'OTP Verified',
                text: 'You have successfully updated  your Profile.',
            }).then(() => {
                window.location.href = '/user-account'; // Redirect to login page
            });
        } else {
            // Handle invalid OTP case
            Swal.fire({
icon: 'error',
title: 'Invalid OTP',
text: 'The OTP you entered is incorrect. Please try again.',
}).then((result) => {
if (result.isConfirmed || result.isDismissed) {
otpInputs.forEach(input => input.value = '');  // Clear the input fields
otpInputs[0].focus();  // Focus the first input field
}
});

        }
    } catch (error) {
        // Catch any other errors, including network issues
        Swal.fire({
            icon: 'error',
            title: 'Network Error',
            text: 'An error occurred while trying to connect to the server. Please check your network and try again.',
        });
    }
});

// Countdown timer for Resend OTP
let countdown = 10; // Set the initial countdown time
const countdownElement = document.getElementById('countdown');
const resendLink = document.getElementById('resend-tag');

// Function to start the countdown
const startCountdown = () => {
// Disable the resend link
resendLink.style.pointerEvents = 'none'; // Disable clicking
resendLink.style.color = 'gray'; // Optional: Change the color to indicate it is disabled

// Set the countdown value and display it
countdownElement.textContent = countdown;

const timer = setInterval(() => {
countdown--;
countdownElement.textContent = countdown;

if (countdown <= 0) {
    clearInterval(timer);
    resendLink.textContent = 'Resend OTP';
    resendLink.style.pointerEvents = 'auto'; // Enable clicking
    resendLink.style.color = ''; // Reset color
} else {
    resendLink.textContent = 'Resend OTP (wait ' + countdown + ' seconds)';
}
}, 1000);
};

// Initial countdown on page load
startCountdown();

// // Add click event listener to resend link
// resendLink.addEventListener('click', async (e) => {
//     e.preventDefault(); // Prevent the default link behavior

//     // Call the backend to resend the OTP
//     const response = await fetch('/resendPassOTP', {
//         method: 'POST', // Or GET depending on your API
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email: 'user@example.com' }) // Replace with actual user email if necessary
//     });

//     const data = await response.json();

//     // Handle the response as needed (you may want to display a success message or handle errors)
//     console.log(data.message);

//     // Reset countdown
//     countdown = 10; // Reset the countdown time
//     startCountdown(); // Restart the countdown
// });


// Handle resend OTP request
resendLink.addEventListener('click', async () => {
// Send the request to the backend to resend OTP
try {
const response = await fetch('/profileResendOTP', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ /* any required data here */ }),
});

if (!response.ok) {
    // Handle server-side error response
    const errorData = await response.json();
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorData.message || 'An error occurred while resending the OTP. Please try again.',
    });
    return;
}

const result = await response.json();

// Handle success response
if (result.success) {
    Swal.fire({
        icon: 'success',
        title: 'OTP Resent',
        text: 'A new OTP has been sent to your registered Email.',
     }).then(() => {
                // Clear OTP inputs on wrong OTP
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus(); // Set focus back to the first input
            });
} else {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to resend OTP. Please try again later.',
    });
}
} catch (error) {
// Handle network error
Swal.fire({
    icon: 'error',
    title: 'Network Error',
    text: 'An error occurred while trying to connect to the server. Please check your network and try again.',
});
}
});

