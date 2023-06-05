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

app.get("/", async function(req, res){

// Server Config
const config = {
  user: "sa",
  password: "M@kar0v99",
  server: "localhost",
  database: "Cvsu_ITS",
  port: 1433,
  options: {
    trustServerCertificate: true,
  },
};

try {
  await mssql.connect(config);
  const request = new mssql.Request();
  const result = await request.query("SELECT * FROM ITstudent");
  res.send(result.recordset);
  
}catch(err) {
  console.log("Database connection error: ", err);
  res.status(500).send("Database connection error");

} finally {
  mssql.close();
}

});

app.listen(port, function(){
  console.log(`Server is running on ${port}`);
});



