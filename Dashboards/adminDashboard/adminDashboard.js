  // Toggle sidebar on small screens
  const sidebar = document.getElementById('sidebar');
  const navbarToggler = document.querySelector('.navbar-toggler');

  navbarToggler.addEventListener('click', function () {
    sidebar.classList.toggle('show');
  });

  document.addEventListener('DOMContentLoaded', function () {
    let editForm; // Define editForm as a global variable
    let recordsets = []; // Store recordsets globally
  
    // Define the editUser function in the global scope
    window.editUser = function (studentID) {
      const recordset = recordsets.find((record) => record.studentID === studentID);
  
      // Fill the edit form with the user's data
      document.getElementById('studentID').value = recordset.studentID;
      document.getElementById('studentFirstName').value = recordset.studentFirstName;
      document.getElementById('studentLastName').value = recordset.studentLastName;
      document.getElementById('YearLevelAndSection').value = recordset.YearLevelAndSection;
      document.getElementById('studentEmail').value = recordset.studentEmail;
      document.getElementById('studentPassword').value = recordset.studentPassword;
  
      // Show the edit modal
      $('#editModal').modal('show');
    };
  
    function fetchRecordsets() {
      // Fetch recordsets from the server
      fetch('/recordsets')
        .then((response) => response.json())
        .then((data) => {
          recordsets = data; // Store the recordsets globally
  
          // Generate the table rows
          const rows = recordsets
            .map(
              (record) => `
            <tr>
              <td>${record.studentID}</td>
              <td>${record.studentFirstName}</td>
              <td>${record.studentLastName}</td>
              <td>${record.YearLevelAndSection}</td>
              <td>${record.studentEmail}</td>
              <td>${record.studentPassword}</td>
              <td>
                <button type="button" class="btn btn-primary" onclick="editUser(${record.studentID})">Edit</button>
              </td>
            </tr>
          `
            )
            .join('');
  
          // Append the rows to the table body
          document.querySelector('#Records tbody').innerHTML = rows;
  
          // Get the edit form
          editForm = document.getElementById('editForm');
        })
        .catch((error) => {
          console.log(error);
          alert('Failed to fetch recordsets');
        });
    }
  
    // Define the saveChanges function in the global scope
    window.saveChanges = function () {
      // Get the form data
      const formData = new FormData(document.getElementById('editForm'));
      console.log(formData);
      const updatedRecord = {};
      for (let [key, value] of formData.entries()) {
        updatedRecord[key] = value;
      }
  
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
  
    // Fetch recordsets on page load
    fetchRecordsets();

  });
  
  
  
  