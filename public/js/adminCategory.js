  
  function showOfferPopup(categoryId) {
    Swal.fire({
        title: 'Add Offer',
        html: `
            <input type="number" id="offerValue" class="swal2-input" placeholder="Enter Offer Value (%)" required>
        `,
        confirmButtonText: 'Submit',
        showCancelButton: true,
        preConfirm: () => {
            const offerValueInput = document.getElementById('offerValue'); // Access input directly by ID
            
            // Check if the input exists and has a value
            if (!offerValueInput || !offerValueInput.value) {
                Swal.showValidationMessage(`Please enter an offer value.`);
                return false; // Prevent further execution
            }

            // Parse the offer value and check if it's valid
            const offerValue = parseFloat(offerValueInput.value);
            if (isNaN(offerValue) || offerValue < 0) {
                Swal.showValidationMessage(`Please enter a valid offer value (greater than or equal to 0).`);
                return false;
            }

            return { offerValue }; // Return the valid offer value
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { offerValue } = result.value;

            // Debugging: Log the values
            console.log('Category ID:', categoryId); // Log category ID
            console.log('Offer Value:', offerValue); // Log offer value

            fetch('/add-offer/' + categoryId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ offerValue }) // Send the offer value
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    Swal.fire('Success!', 'The offer has been added.', 'success').then(() => {
                        location.reload(); // Reload to reflect changes
                    });
                } else {
                    Swal.fire('Error!', data.message || 'There was an error adding the offer.', 'error');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error); // Log fetch error
                Swal.fire('Error!', 'There was an error with the request.', 'error');
            });
        }
    });
}

function removeOffer(categoryId) {
    console.log("Removing offer for category ID:", categoryId); // Debugging log
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you really want to remove this offer?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, remove it!',
        cancelButtonText: 'No, keep it'
    }).then((result) => {
        if (result.isConfirmed) {
            console.log("Fetching to remove offer..."); // Debugging log
            fetch('/remove-offer/' + categoryId, {
                method: 'POST'
            })
            .then(response => {
                console.log("Response Status:", response.status); // Debugging log
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    Swal.fire('Removed!', 'The offer has been removed.', 'success').then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Error!', 'There was an error removing the offer.', 'error');
                }
            })
            .catch(error => {
                console.error("Fetch Error:", error); // Debugging log for catch block
                Swal.fire('Error!', 'There was an error with the request.', 'error');
            });
        }
    });
}

   
const deleteButtons = document.querySelectorAll('.deleteCategory');
deleteButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent the default form submission immediately
        const categoryId = e.target.closest('form').id.replace('deleteButton', '');

        // Use SweetAlert for confirmation
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you really want to delete this category?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it'
        }).then((result) => {
            if (result.isConfirmed) {
                // Show a loading message while deleting
                Swal.fire({
                    title: 'Deleting...',
                    text: 'Your category is being deleted.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                    onOpen: () => {
                        Swal.showLoading();
                    }
                });

                const form = document.getElementById('deleteButton' + categoryId);
                form.submit(); // Submit the form after confirmation
            }
        });
    });
});



    function showAddCategoryPopup() {
    Swal.fire({
        title: 'Add Category',
        html: `
            <input type="text" id="categoryName" class="swal2-input" placeholder="Enter Category Name" required>
        `,
        confirmButtonText: 'Submit',
        showCancelButton: true,
        preConfirm: () => {
            const categoryName = document.getElementById('categoryName').value;

            if (!categoryName) {
                Swal.showValidationMessage(`Please enter a category name.`);
                return false; // Prevent further execution
            }

            return { categoryName }; // Return the valid data
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { categoryName } = result.value;

            const formData = new FormData();
            formData.append('cname', categoryName); // Only append category name

            fetch('/add-category', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest', // Indicate AJAX request
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('Success!', data.message, 'success').then(() => {
                        location.reload(); // Reload to reflect changes
                    });
                } else {
                    Swal.fire('Error!', data.message || 'There was an error adding the category.', 'error');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                Swal.fire('Error!', 'There was an error with the request.', 'error');
            });
        }
    });
}
function editCategory(categoryId, currentCategoryName) {
    Swal.fire({
        title: 'Edit Category',
        html: `
            <input type="text" id="categoryName" class="swal2-input" placeholder="Enter New Category Name" value="${currentCategoryName}" required>
        `,
        confirmButtonText: 'Submit',
        showCancelButton: true,
        preConfirm: () => {
            const categoryNameInput = document.getElementById('categoryName');
            
            if (!categoryNameInput || !categoryNameInput.value) {
                Swal.showValidationMessage(`Please enter a category name.`);
                return false;
            }

            const categoryName = categoryNameInput.value;
            return { categoryName };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { categoryName } = result.value;
            
            fetch('/edit-category/' + categoryId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cname: categoryName })
            })
            .then(response => {
                console.log('Response:', response); // Log the response for debugging
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    Swal.fire('Success!', 'Category has been updated.', 'success').then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Error!', data.message || 'There was an error updating the category.', 'error');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                Swal.fire('Error!', 'There was an error with the request.', 'error');
            });
        }
    });
}

  