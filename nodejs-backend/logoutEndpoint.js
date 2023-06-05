const express = require("express");
const router = express.Router();

// Logout Endpoint
router.get("/logout", (req, res) => {
  res.redirect("/");
});

module.exports = router;