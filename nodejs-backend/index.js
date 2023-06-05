const express = require("express");
const app = express();
const serverConfiguration = require("./serverConfiguration");
// const loginEndpoint = require("./loginEndpoint");
// const logoutEndpoint = require("./logoutEndpoint");
const port = 5000;

// Middleware for serving static assets
app.use("/assets", express.static("assets"));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // Redirect to loginForm
// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/loginForm.html");
// });

// // Dashboard endpoint
// app.get("/dashboard", function (req, res) {
//   res.sendFile(__dirname + "/dashboard.html");
// });

// app.use("/", loginEndpoint);
// app.use("/", logoutEndpoint);

app.listen(port, function () {
  console.log(`Server is running on ${port}`);
});