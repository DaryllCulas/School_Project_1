const express = require("express");
const mssql = require("mssql");
const router = express.Router();
const config = require("./serverConfiguration");

// Login endpoint
router.post('/login', (req, res) => {
  const { studentID, Email, StudentPassword } = req.body;

  const pool = new mssql.ConnectionPool(config);
  pool.connect((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Server error');
    }

    const request = new mssql.Request(pool);

    const query = `SELECT * FROM studentTable WHERE studentID = '${studentID}' AND Email = '${Email}' AND StudentPassword = '${StudentPassword}'`;

    request.query(query, (err, recordset) => {
      if (err) {
        console.log(err);
        return res.status(500).send('Server error');
      }

      if (recordset.recordset.length > 0) {
        res.send(`
        <script>
        alert("Login Successfully Login");
        window.location.href = "/dashboard";
          </script>
          `);
          
      } else {
      
        return res.redirect("/?error=1");
      }
    });
  });
});

module.exports = router;