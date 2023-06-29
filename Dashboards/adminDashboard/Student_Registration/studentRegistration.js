const form = document.getElementById('main-form');
const registerButton = document.querySelector('.button input');

registerButton.addEventListener('click', function(event) {
  event.preventDefault();

  const formData = new FormData(form);

  const student = {
    studentFirstName: formData.get('studentFirstName'),
    studentLastName: formData.get('studentLastName'),
    studentID: formData.get('studentID'),
    YearLevelAndSection: formData.get('YearLevelAndSection'),
    studentEmail: formData.get('studentEmail'),
    studentPassword: formData.get('studentPassword'),
  };

  // Send the student data to the server
  fetch('/recordsets/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(student),
  })
    .then((response) => response.text())
    .then((data) => {
      alert('Student added successfully!');
      form.reset();
    })
    .catch((error) => {
      console.log(error);
      alert('Failed to add student');
    });
});
