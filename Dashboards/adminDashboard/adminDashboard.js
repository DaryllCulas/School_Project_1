// Toggle sidebar on small screens
const sidebar = document.getElementById('sidebar');
const navbarToggler = document.querySelector('.navbar-toggler');

navbarToggler.addEventListener('click', function () {
  sidebar.classList.toggle('show');
});

document.addEventListener('DOMContentLoaded', function () {
  let recordsets = []; // Store recordsets globally
  let editForm; // Define editForm as a global variable

  function fetchRecordsets() {
    // Fetch recordsets from the server
    fetch('/recordsets')
      .then((response) => response.json())
      .then((data) => {
        recordsets = data; // Store the recordsets globally
        generateTableRows();
        editForm = document.getElementById('editForm'); // Get the edit form
      })
      .catch((error) => {
        console.log(error);
        alert('Failed to fetch recordsets');
      });
  }

  function generateTableRows() {
    const rows = recordsets
      .map((record) => {
        // Hash the student password using CryptoJS
        const hashedPassword = CryptoJS.SHA256(record.studentPassword).toString();
  
        return `
          <tr>
            <td>${record.studentID}</td>
            <td>${record.studentFirstName}</td>
            <td>${record.studentLastName}</td>
            <td>${record.YearLevelAndSection}</td>
            <td>${record.studentEmail}</td>
            <td>${hashedPassword}</td>
            <td>
              <button type="button" class="btn btn-primary" onclick="editUser(${record.studentID})">Edit</button>
              
              <button type="button" class="btn btn-danger" onclick="confirmDelete(${record.studentID})">Delete</button>
            </td>
          </tr>
        `;
      })
      .join('');
  
    // Append the rows to the table body
    document.querySelector('#Records tbody').innerHTML = rows;
  }
  

  window.editUser = function (studentID) {
    const recordset = recordsets.find((record) => record.studentID === studentID);

    if (!recordset) {
      console.log(`Recordset with studentID ${studentID} not found.`);
      return;
    }

    // Fill the edit form with the user's data
    document.getElementById('studentID').value = recordset.studentID || '';
    document.getElementById('studentFirstName').value = recordset.studentFirstName || '';
    document.getElementById('studentLastName').value = recordset.studentLastName || '';
    document.getElementById('YearLevelAndSection').value = recordset.YearLevelAndSection || '';
    document.getElementById('studentEmail').value = recordset.studentEmail || '';
    document.getElementById('studentPassword').value = recordset.studentPassword || '';

    // Show the edit modal
    $('#editModal').modal('show');
  };

  window.saveChanges = function () {
    // Get the form data
    const formData = new FormData(document.getElementById('editForm'));
    const updatedRecord = Object.fromEntries(formData.entries());

    // Send the updated record to the server
    fetch(`/recordsets/update/${updatedRecord.studentID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedRecord),
    })
      .then((response) => response.text())
      .then((data) => {
        alert('Updated Successfully!');
        fetchRecordsets(); // Fetch and update the recordsets in the table
        $('#editModal').modal('hide'); // Hide the edit modal
      })
      .catch((error) => {
        console.log(error);
        alert('Failed to update the record');
      });
  };

  window.confirmDelete = function (studentID) {
    // Prompt for confirmation
    if (confirm('Are you sure you want to delete this user?')) {
      // Send the delete request to the server
      fetch(`/recordsets/delete/${studentID}`, {
        method: 'DELETE',
      })
        .then((response) => response.text())
        .then((data) => {
          alert('User deleted successfully!');
          fetchRecordsets(); // Fetch and update the recordsets in the table
          $('#deleteModal').modal('hide'); // Hide the delete modal
        })
        .catch((error) => {
          console.log(error);
          alert('Failed to delete the user');
        });
    }
  };

  fetchRecordsets(); // Fetch recordsets on page load
});
