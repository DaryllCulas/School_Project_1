const express = require("express");
const app = express();
const serverConfig = require("./serverConfiguration");
const loginEndpoint = require("./loginEndpoint");
const logoutEndpoint = require("./logoutEndpoint");
const path = require("path");
const port = 5000;

// Middleware for serving static assets
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Middleware for serveing static Portals
app.use("/Portals", express.static(path.join(__dirname, "../Portals")));

// Middleware for serving static studentLoginForm
app.use("/Login-form", express.static(path.join(__dirname, "../Login-form")));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Redirect to Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../index.html"));
});



// Dashboard endpoint
app.get("/dashboard", function (req, res) {
  res.sendFile(path.join(__dirname, "../Dashboards/studentDashboard.html"));
});

app.use("/", loginEndpoint);
app.use("/", logoutEndpoint);

app.listen(port, function () {
  console.log(`Server is running on ${port}`);
});
