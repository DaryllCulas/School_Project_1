  // Toggle sidebar on small screens
  const sidebar = document.getElementById('sidebar');
  const navbarToggler = document.querySelector('.navbar-toggler');

  navbarToggler.addEventListener('click', function () {
    sidebar.classList.toggle('show');
  });

 // Update the editUser function
function editUser(studentID, studentFirstName, studentLastName, YearLevelAndSection, studentEmail, studentPassword) {
  const editModal = document.getElementById("editModal");
  const idInput = editModal.querySelector("#studentID");
  const firstNameInput = editModal.querySelector("#studentFirstName");
  const lastNameInput = editModal.querySelector("#studentLastName");
  const yearSectionInput = editModal.querySelector("#YearLevelAndSection");
  const emailInput = editModal.querySelector("#studentEmail");
  const passwordInput = editModal.querySelector("#studentPassword");

  idInput.value = studentID;
  firstNameInput.value = studentFirstName;
  lastNameInput.value = studentLastName;
  yearSectionInput.value = YearLevelAndSection;
  emailInput.value = studentEmail;
  passwordInput.value = studentPassword;
}

// Update the saveChanges function
function saveChanges() {
  const form = document.getElementById("editForm");
  if (!form) {
    console.error("Form element not found");
    return;
  }

  const studentID = form.getAttribute("data-id");
  const studentFirstName = form.querySelector("#studentFirstName").value;
  const studentLastName = form.querySelector("#studentLastName").value;
  const YearLevelAndSection = form.querySelector("#YearLevelAndSection").value;
  const studentEmail = form.querySelector("#studentEmail").value;
  const studentPassword = form.querySelector("#studentPassword").value;

  const studentData = {
    studentID,
    studentFirstName,
    studentLastName,
    YearLevelAndSection,
    studentEmail,
    studentPassword
  };

  fetch(`/recordsets/update/${studentID}`, {
    method: 'PUT',
    body: JSON.stringify(studentData),
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      $('#editModal').modal('hide');
      const editedTableRow = document.querySelector(`tr[data-id="${studentID}"]`);
      editedTableRow.innerHTML = `
        <td>${studentID}</td>
        <td>${studentFirstName}</td>
        <td>${studentLastName}</td>
        <td>${YearLevelAndSection}</td>
        <td>${studentEmail}</td>
        <td>${studentPassword}</td>
        <td class="table-actions">
          <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#editModal"
            onclick="editUser('${studentID}', '${studentFirstName}', '${studentLastName}', '${YearLevelAndSection}', '${studentEmail}', '${studentPassword}')">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteUser('${studentID}')">Delete</button>
        </td>
      `;
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

document.addEventListener('DOMContentLoaded', function() {

  // Update the editUser function
  // function editUser(studentID, studentFirstName, studentLastName, YearLevelAndSection, studentEmail, studentPassword) {
  //   const editForm = document.getElementById("editForm");
  //   const idInput = document.getElementById("studentID");
  //   const firstNameInput = document.getElementById("studentFirstName");
  //   const lastNameInput = document.getElementById("studentLastName");
  //   const yearSectionInput = document.getElementById("YearLevelAndSection");
  //   const emailInput = document.getElementById("studentEmail");
  //   const passwordInput = document.getElementById("studentPassword");

  //   editForm.setAttribute("data-id", studentID);

  //   idInput.value = studentID;
  //   firstNameInput.value = studentFirstName;
  //   lastNameInput.value = studentLastName;
  //   yearSectionInput.value = YearLevelAndSection;
  //   emailInput.value = studentEmail;
  //   passwordInput.value = studentPassword;
  // }

  // // Update the saveChanges function
  // function saveChanges() {
  //   const form = document.getElementById("editForm");
  //   const studentID = form.getAttribute("data-id");
  //   const studentFirstName = form.querySelector("#studentFirstName").value;
  //   const studentLastName = form.querySelector("#studentLastName").value;
  //   const YearLevelAndSection = form.querySelector("#YearLevelAndSection").value;
  //   const studentEmail = form.querySelector("#studentEmail").value;
  //   const studentPassword = form.querySelector("#studentPassword").value;

  //   const studentData = {
  //     studentID,
  //     studentFirstName,
  //     studentLastName,
  //     YearLevelAndSection,
  //     studentEmail,
  //     studentPassword
  //   };

  //   fetch(`/recordsets/update/${studentID}`, {
  //     method: 'PUT',
  //     body: JSON.stringify(studentData),
  //     headers: {
  //       'Content-Type': 'application/json'
  //     }
  //   })
  //     .then(response => response.json())
  //     .then(data => {
  //       console.log(data);
  //       $('#editModal').modal('hide');
  //       const editedTableRow = document.querySelector(`tr[data-id="${studentID}"]`);
  //       editedTableRow.innerHTML = `
  //         <td>${studentID}</td>
  //         <td>${studentFirstName}</td>
  //         <td>${studentLastName}</td>
  //         <td>${YearLevelAndSection}</td>
  //         <td>${studentEmail}</td>
  //         <td>${studentPassword}</td>
  //         <td class="table-actions">
  //           <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#editModal"
  //             onclick="editUser('${studentID}', '${studentFirstName}', '${studentLastName}', '${YearLevelAndSection}', '${studentEmail}', '${studentPassword}')">Edit</button>
  //           <button type="button" class="btn btn-danger btn-sm" onclick="deleteUser('${studentID}')">Delete</button>
  //         </td>
  //       `;
  //     })
  //     .catch(error => {
  //       console.error('Error:', error);
  //     });
  // }

    function fetchRecords() {
  fetch('/recordsets')
    .then(response => response.json())
    .then(data => {
      // Iterate over the fetched data and create table rows dynamically
      data.forEach(record => {
        const tableRow = document.createElement("tr");
        // Inside the data.forEach loop
        tableRow.setAttribute("data-id", record.studentID);
        tableRow.innerHTML = `
          <td>${record.studentID}</td>
          <td>${record.studentFirstName}</td>
          <td>${record.studentLastName}</td>
          <td>${record.YearLevelAndSection}</td>
          <td>${record.studentEmail}</td>
          <td>${record.studentPassword}</td>
          <td class="table-actions">
            <button type="button" class="btn btn-primary btn-sm" data-toggle="modal" data-target="#editModal"
              onclick="editUser('${record.studentID}', '${record.studentFirstName}', '${record.studentLastName}', '${record.YearLevelAndSection}', '${record.studentEmail}', '${record.studentPassword}')">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#deleteModal" onclick="deleteUser('${record.studentID}')">Delete</button>
          </td>
        `;
        document.querySelector("tbody").appendChild(tableRow);
      });
    })
    .catch(error => {
      console.error("Error fetching records:", error);
    });
}
window.addEventListener("load", fetchRecords);

});