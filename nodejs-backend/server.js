const express = require("express");
const mssql = require("mssql");
const router = express.Router();
const app = express();
const port = 5000;


// Middleware for serving static assets
app.use("/assets", express.static("assets"));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async function(req, res) {
  const config = {
    user: "sa",
    password: "M@kar0v99",
    server: "172.17.0.1",
    database: "Cvsu_ITS",
    port: 1443,
    options: {
      trustServerCertificate: true,
    },
  };

  try {
    // Establish a connection to the SQL Server database
    await mssql.connect(config);

    // Create a new request object 
    const request = new mssql.Request();

    // Execute the query and store the result 
    const result = await request.query("SELECT * FROM ITstudent");

    // Send the recordset as the response
    res.send(result.recordset);
  
  } catch(err) {

    // Handle database connection or query errors
    console.log("Database Connection Error: ", err);
    res.send(500).send("Database connection error");
  } finally {
    
    // Close the database connection 
    mssql.close();
  }

});

app.use("/", router);

app.listen(port, function () {
  console.log(`Server is running on ${port}`);
});

module.exports = router;