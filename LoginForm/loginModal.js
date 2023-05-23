document.addEventListener("DOMContentLoaded", function() {
  var link = document.querySelector("#LoginModal.page-scroll");

  link.addEventListener("click", function(event) {
    event.preventDefault();

    // Create the modal elements
    var modal = document.createElement("div");
    modal.id = "loginModal";
    modal.classList.add("modal");
    var modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");
    var closeBtn = document.createElement("span");
    closeBtn.classList.add("close");
    closeBtn.innerHTML = "&times;";
    var heading = document.createElement("h2");
    heading.textContent = "Login Form";
    var form = document.createElement("form");
    var usernameLabel = document.createElement("label");
    usernameLabel.setAttribute("for", "username");
    usernameLabel.textContent = "Username:";
    var usernameInput = document.createElement("input");
    usernameInput.setAttribute("type", "text");
    usernameInput.setAttribute("id", "username");
    usernameInput.setAttribute("name", "username");

    var passwordLabel = document.createElement("label");
    passwordLabel.setAttribute("for", "password");
    passwordLabel.textContent = "Password:";
    var passwordInput = document.createElement("input");
    passwordInput.setAttribute("type", "password");
    passwordInput.setAttribute("id", "password");
    passwordInput.setAttribute("name", "password");

        // Create the first span element
    var usernameSpan = document.createElement("span");
    usernameSpan.textContent = "Please fill up your username";
    usernameSpan.style.display = "none";

    // Create the second span element
    var passwordSpan = document.createElement("span");
    passwordSpan.textContent = "Please fill up your Password";
    passwordSpan.style.display = "none";


    var submitBtn = document.createElement("input");
    submitBtn.setAttribute("type", "button");
    submitBtn.setAttribute("value", "Login");

    // Append the elements to the modal
    form.appendChild(usernameLabel);
    form.appendChild(usernameInput);
    form.appendChild(document.createElement("br"));
    // Append the spans to the document body
    form.appendChild(usernameSpan);
    form.appendChild(document.createElement("br"));
    form.appendChild(passwordLabel);
    form.appendChild(passwordInput);
    form.appendChild(document.createElement("br"));
     // Append the spans to the document body
    form.appendChild(passwordSpan);
    form.appendChild(document.createElement("br"));
    form.appendChild(submitBtn);

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(heading);
    modalContent.appendChild(form);

    modal.appendChild(modalContent);

    // Add the modal to the DOM
    document.body.appendChild(modal);

    // Show the modal
    modal.style.display = "block";

    // Close the modal when the close button is clicked
    closeBtn.addEventListener("click", function() {
      modal.style.display = "none";
    });

    // Close the modal when clicking outside the modal
    window.addEventListener("click", function(event) {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });

    // Function for username and password trimming
    submitBtn.addEventListener("click", function(event){
     var usernameInput = document.getElementById('username').value;
     var passwordInput = document.getElementById('password').value;

     var trimmedusernameInput = usernameInput.trim();
     var trimmedpasswordInput = passwordInput.trim();

     if(trimmedusernameInput === "") {
        usernameSpan.style.display = "block";
        event.preventDefault(); //Prevent Default Submission
     }
     else {
        usernameSpan.style.display = "none";
     }

     if(trimmedpasswordInput === "") {
        passwordSpan.style.display = "block";
        event.preventDefault();
     }
     else {
        passwordSpan.style.display = "none";
     }




      
    });

  });
});
