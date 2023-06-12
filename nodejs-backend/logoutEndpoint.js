const express = require("express");
const router = express.Router();

// Logout Endpoint 
router.get("/logout", (req, res) => {
  res.send(`<script> 
  alert('Logging out...'); 
  window.location.href="../Portals/portal.html";
  </script>`);
});


module.exports = router;