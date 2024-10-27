
   
    function showProductOfferPopup(productId) {
    Swal.fire({
        title: 'Add Offer',
        html: `<input type="number" id="offerValue" class="swal2-input" placeholder="Enter Offer Value (%)" required>`,
        confirmButtonText: 'Submit',
        showCancelButton: true,
        preConfirm: () => {
            const offerValueInput = document.getElementById('offerValue');
            if (!offerValueInput || !offerValueInput.value) {
                Swal.showValidationMessage('Please enter an offer value.');
                return false;
            }
            const offerValue = parseFloat(offerValueInput.value);
            if (isNaN(offerValue) || offerValue < 0) {
                Swal.showValidationMessage('Please enter a valid offer value (greater than or equal to 0).');
                return false;
            }
            return { offerValue };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { offerValue } = result.value;

            // Ensure productId is being passed correctly
            fetch('/add-product-offer/' + productId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerValue })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire('Success!', 'The offer has been added.', 'success').then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Error!', 'There was an error adding the offer.', 'error');
                }
            })
            .catch(() => Swal.fire('Error!', 'There was an error with the request.', 'error'));
        }
    });
}



    function removeProductOffer(productId) {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you really want to remove this offer?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, remove it!',
            cancelButtonText: 'No, keep it'
        }).then((result) => {
            if (result.isConfirmed) {
                fetch('/remove-product-offer/' + productId, {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire('Removed!', 'The offer has been removed.', 'success').then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire('Error!', 'There was an error removing the offer.', 'error');
                    }
                })
                .catch(() => Swal.fire('Error!', 'There was an error with the request.', 'error'));
            }
        });
    }
    document.querySelectorAll('.deleteProduct').forEach((button) => {
    button.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent the default form submission

        const productId = e.target.closest('form').id.replace('deleteButton', '');

        // Show SweetAlert confirmation dialog
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you really want to delete this product?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Deleting...',
                    text: 'Your product is being deleted.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false
                });

                // After a short delay, submit the form
                setTimeout(() => {
                    const form = document.getElementById('deleteButton' + productId);
                    form.submit();
                }, 2000);
            }
        });
    });
});
