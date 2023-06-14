const express = require("express");
const mssql = require("mssql");
const router = express.Router();
const config = require("./serverConfiguration");

// Login endpoint for student login
router.post('/student_login', (req, res) => {
  const { studentID, studentEmail, studentPassword } = req.body;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = `SELECT * FROM ITstudent WHERE studentID = '${studentID}' AND studentEmail = '${studentEmail}' AND studentPassword = '${studentPassword}'`;

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      if (recordset.recordset.length > 0) {
        res.send(`
        <script>
        alert("Login Successfully!");
        window.location.href = "${'/studentDashboard'}";
          </script>
          `);
          
      } else {
        res.send(`
        <script>
          alert("Invalid data");
          window.location.href = "../Login-form/studentLoginForm.html";
        </script>
      `);
      }
    });
  });
});


//Login Endpoint for Admin Login
router.post('/admin_login',(req, res) => {
  const { facultyID, facultyEmail, facultyPassword } = req.body;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = `SELECT * FROM AdminFaculty WHERE facultyID = '${facultyID}' AND facultyEmail = '${facultyEmail}' AND facultyPassword = '${facultyPassword}'`;

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      if (recordset.recordset.length > 0) {
        res.send(`
        <script>
        alert("Login Successfully");
        window.location.href = "${'/adminDashboard'}";
          </script>
          `);
          
      } else {
        res.send(`
        <script>
          alert("Invalid data");
          window.location.href = "../Login-form/adminLoginForm.html";
        </script>
      `);
      }
    });
  });

});


// API endpoint for fetching recordsets
router.get('/recordsets', (req, res) => {
  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = 'SELECT * FROM ITstudent';

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      res.json(recordset.recordset);
    });
  });
});

module.exports = router;

