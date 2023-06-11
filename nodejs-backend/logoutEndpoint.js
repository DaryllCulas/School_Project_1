const express = require("express");
const router = express.Router();

// Logout Endpoint 
router.get("/logout", (req, res) => {
  res.redirect("../Portals/portal.html");
});


module.exports = router;