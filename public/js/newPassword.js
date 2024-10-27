   
document.getElementById("form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;

    // Clear previous warnings
    document.querySelectorAll('.warn').forEach(warn => warn.textContent = '');

    // Perform frontend validation
    if (newPassword !== confirmNewPassword) {
        document.querySelector('.warn').textContent = 'New password and confirm password do not match!';
        return;
    }

    // Prepare data to send to the backend
    const data = {
        currentPassword,
        newPassword,
        confirmNewPassword
    };

    try {
        const response = await fetch('/updatePassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                background: '#fff',
                color: '#000',
                confirmButtonColor: '#000'
            }).then(() => {
                window.location.href = '/user-account'; // Replace with your desired redirect page
            });
        } else {
            // Show error message
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: result.message,
                background: '#fff',
                color: '#000',
                confirmButtonColor: '#000'
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'An error occurred while updating the password. Please try again later.',
            background: '#fff',
            color: '#000',
            confirmButtonColor: '#000'
        });
    }
});
   