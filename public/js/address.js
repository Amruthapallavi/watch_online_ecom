 
document.getElementById('addAddressBtn').addEventListener('click', function () {
  const form = document.getElementById('addressForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.querySelectorAll('.edit-address-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const id = this.getAttribute('data-id');
    // Fetch and populate the form fields
    fetch(`/get-address/${id}`)
      .then(res => res.json())
      .then(data => {
        document.getElementById('editAddressId').value = data.id;
        document.getElementById('editName').value = data.name;
        document.getElementById('editPhone').value = data.phone;
        // Populate other fields similarly
        document.getElementById('editAddressForm').style.display = 'block';
      });
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const phoneInput = document.getElementById('phone');
  const phoneError = document.getElementById('phoneError');
  const pincodeInput = document.getElementById('pincode');
  const pincodeError = document.getElementById('pincodeError');
  const form = document.getElementById('newAddressForm');

  function isValidPhone(value) {
    return /^\d{10}$/.test(value);
  }

  function isValidPincode(value) {
    return /^\d{6}$/.test(value);
  }

  function updateErrorMessages() {
    const phoneValue = phoneInput.value;
    const pincodeValue = pincodeInput.value;

    phoneError.style.display = isValidPhone(phoneValue) ? 'none' : 'block';
    pincodeError.style.display = isValidPincode(pincodeValue) ? 'none' : 'block';
  }

  phoneInput.addEventListener('input', updateErrorMessages);
  pincodeInput.addEventListener('input', updateErrorMessages);

  form.addEventListener('submit', function (e) {
    updateErrorMessages();

    if (!isValidPhone(phoneInput.value) || !isValidPincode(pincodeInput.value)) {
        // Show SweetAlert instead of alert
        swal({
            title: "Validation Error",
            text: "Please Fill all the fields with valid data",
            icon: "error",
            button: "Ok",
        });
    } else {
        // If everything is valid, submit the form
        submitForm(this); // Call your existing submit function
    }
  });
});



  function submitForm(form){
    swal({
title: "Successfull!",
text: "Your address added successfully",
icon: "success",
button: "Ok",
}).then((isOkay)=>{
      if(isOkay){
        form.submit();
      }
    });
    return false;
  }

  
  function editForm(form){
    swal({
title: "Successfull!",
text: "Your address edited successfully",
icon: "success",
button: "Ok",
}).then((isOkay)=>{
      if(isOkay){
        form.submit();
      }
    });
    return false;
  }

  function deleteAddress(form){
    swal("Are you sure to delete this address?", {
buttons: ["Cancel", "Delete"],
}).then((isOkay)=>{
      if(isOkay){
        form.submit();
      }
    });
    return false;
  }
  

document.addEventListener('DOMContentLoaded', function () {
document.getElementById('newAddressForm').addEventListener('submit', function (e) {

const form = this;
const formData = new FormData(form);

fetch(form.action, {
  method: 'POST',
  body: formData,
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'Address successfully added.',
    }).then(() => {
      // Optionally, you can redirect or refresh the page after the alert
      location.reload(); // Reload the page to reflect the new address
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: data.message || 'An error occurred while adding the address.',
    });
  }
})
.catch(error => {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: 'An unexpected error occurred.',
  });
});
});
});

