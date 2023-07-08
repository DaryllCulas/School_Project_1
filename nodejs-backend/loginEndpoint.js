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

// API Endpoint for fetching student profile data
router.get('/student_profile_data', (req, res) => {
  if (!req.session.student) {
    return res.status(401).send('Unauthorized');
  }

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const studentID = req.session.student.studentID;
    const query = `SELECT * FROM ITstudent WHERE studentID = '${studentID}'`;

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      if (recordset.recordset.length === 0) {
        return res.status(404).send('Student not found');
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

// API endpoint for updating a record
router.put('/recordsets/update/:id', (req, res) => {
  const { id } = req.params;
  const { studentFirstName, studentLastName, YearLevelAndSection, studentEmail, studentPassword } = req.body;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = `UPDATE ITstudent
      SET studentFirstName = @studentFirstName,
          studentLastName = @studentLastName,
          YearLevelAndSection = @YearLevelAndSection,
          studentEmail = @studentEmail,
          studentPassword = @studentPassword
      WHERE studentID = @id
    `;

    request.input('studentFirstName', mssql.NVarChar, studentFirstName);
    request.input('studentLastName', mssql.NVarChar, studentLastName);
    request.input('YearLevelAndSection', mssql.NVarChar, YearLevelAndSection);
    request.input('studentEmail', mssql.NVarChar, studentEmail);
    request.input('studentPassword', mssql.NVarChar, studentPassword);
    request.input('id', mssql.NVarChar, id);

    request.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      // Return a success message or relevant data if needed
      res.send('<script>alert("Updated Successfully!");</script>');
    });
  });
});


// API endpoint for deleting a record

router.delete('/recordsets/delete/:id', (req, res) => {
  const { id } = req.params;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = `
      DELETE FROM ITstudent
      WHERE studentID = @id
    `;

    request.input('id', mssql.NVarChar, id);

    request.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      // Return a success message or relevant data if needed
      res.send('User deleted successfully!');

    });
  });
});


// API endpoint for adding a student record in registration form

router.post('/recordsets/add', (req, res) => {
  const { studentFirstName, studentLastName, YearLevelAndSection, studentEmail, studentPassword } = req.body;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);
    const query = `
      INSERT INTO ITstudent (studentFirstName, studentLastName, YearLevelAndSection, studentEmail, studentPassword)
      VALUES (@studentFirstName, @studentLastName, @YearLevelAndSection, @studentEmail, @studentPassword);
      SELECT SCOPE_IDENTITY() AS newStudentID;
    `;

    request.input('studentFirstName', mssql.NVarChar, studentFirstName);
    request.input('studentLastName', mssql.NVarChar, studentLastName);
    request.input('YearLevelAndSection', mssql.NVarChar, YearLevelAndSection);
    request.input('studentEmail', mssql.NVarChar, studentEmail);
    request.input('studentPassword', mssql.NVarChar, studentPassword);

    request.query(query, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      const newStudentID = result.recordset[0].newStudentID;
      res.send(`Student added successfully! Student ID: ${newStudentID}`);
    });
  });
});




module.exports = router;



