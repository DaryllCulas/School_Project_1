//  // Fetch admin profile data
//  fetch('/admin_profile_data')
//  .then((response) => response.json())
//  .then((data) => {
//    const adminData = data[0]; // Assuming there is only one admin in the database
//    document.getElementById('facultyID').textContent = adminData.facultyID;
//    document.getElementById('facultyFirstName').textContent = adminData.facultyFirstName;
//    document.getElementById('facultyLastName').textContent = adminData.facultyLastName;
//    document.getElementById('facultyEmail').textContent = adminData.facultyEmail;
//    document.getElementById('facultyPassword').textContent = adminData.facultyPassword;
//  })
//  .catch((error) => console.log(error));