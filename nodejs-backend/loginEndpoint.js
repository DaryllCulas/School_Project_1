const express = require("express");
const mssql = require("mssql");
const router = express.Router();
const config = require("./serverConfiguration");
const session = require("express-session");
const path = require("path");

// Configure express-session middleware
router.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    // You can customize the session configuration as per your needs
  })
);

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
        // Store student's credentials in the session
        req.session.student = recordset.recordset[0];

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

// Login Endpoint for Admin Login
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
        // Store admin's credentials in the session
        req.session.admin = recordset.recordset[0];
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

// Endpoint for fetching admin profile data
router.get('/admin_profile_data', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).send('Unauthorized');
  }

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const facultyID = req.session.admin.facultyID;
    const query = `SELECT * FROM AdminFaculty WHERE facultyID = '${facultyID}'`;

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      if (recordset.recordset.length === 0) {
        return res.status(404).send('Admin not found');
      }

      res.json(recordset.recordset);
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
