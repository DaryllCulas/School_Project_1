const express = require("express");
const router = express.Router();

// Logout Endpoint 
router.get("/logout", (req, res) => {
  res.send(`<script> 
  if(confirm('Are you sure you want to log out?')) {
    alert('Logging out...');
    window.location.href = "../Portals/portal.html";
  }
  else {
    history.back();
  }
  </script>`);
});


module.exports = router;