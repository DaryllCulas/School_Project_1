const express = require("express");
const app = express();
const serverConfig = require("./serverConfig");
const loginEndpoint = require("./loginEndpoint");
// const logoutEndpoint = require("./logoutEndpoint");
const path = require("path");
const port = 5000;

// Middleware for serving static assets
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect to loginForm
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Login-form/studentLoginForm.html"));
});

// // Dashboard endpoint
// app.get("/dashboard", function (req, res) {
//   res.sendFile(__dirname + "/dashboard.html");
// });

app.use("/", loginEndpoint);
// app.use("/", logoutEndpoint);

app.listen(port, function () {
  console.log(`Server is running on ${port}`);
});
