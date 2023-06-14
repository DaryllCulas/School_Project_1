const express = require("express");
const app = express();
const serverConfig = require("./serverConfiguration");
const loginEndpoint = require("./loginEndpoint");
const logoutEndpoint = require("./logoutEndpoint");
const path = require("path");
const port = 5000;

// Middleware for serving static assets
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Middleware for serving static Portals
app.use("/Portals", express.static(path.join(__dirname, "../Portals")));

// Middleware for serving static LoginForm
app.use("/Login-form", express.static(path.join(__dirname, "../Login-form")));

// Middleware for serving static index
app.use("/",express.static(path.join(__dirname, "../")));

// Middleware for serving static adminDashboard 
app.use("/adminDashboard", express.static(path.join(__dirname, "../Dashboards/adminDashboard")));

// Middleware for serving static studentDashboard
app.use("/studentDashboard", express.static(path.join(__dirname, "../Dashboards/studentDashboard/Student Dashboard")));
// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Redirect to Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});


// Dashboard endpoint for student
app.get("/studentDashboard", function (req, res) {
  res.sendFile(path.join(__dirname, "../Dashboards/studentDashboard/Student Dashboard/studentsdb.html"));
});


// Dashboard endpoint for admin
app.get("/adminDashboard", function (req,res){
  res.sendFile(path.join(__dirname, "../Dashboards/adminDashboard/adminDashboard.html"));
});


app.use("/", loginEndpoint);
app.use("/", logoutEndpoint);

app.listen(port, function () {
  console.log(`Server is running on ${port}`);
});
