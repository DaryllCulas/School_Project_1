/* Hover effects that stays highlighted and active its lists when selected */
var navLinks = document.querySelectorAll(".menu li a");


for (var i = 0; i < navLinks.length; i++) {
  navLinks[i].addEventListener("click", function() {
    for (var j = 0; j < navLinks.length; j++) {
      navLinks[j].classList.remove("active");
    }
    this.classList.add("active");
   
  });

  
}