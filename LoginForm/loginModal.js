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
    const usernameInput = document.createElement("input");
    usernameInput.setAttribute("type", "text");
    usernameInput.setAttribute("id", "username");
    usernameInput.setAttribute("name", "username");

    var passwordLabel = document.createElement("label");
    passwordLabel.setAttribute("for", "password");
    passwordLabel.textContent = "Password:";
    const passwordInput = document.createElement("input");
    passwordInput.setAttribute("type", "password");
    passwordInput.setAttribute("id", "password");
    passwordInput.setAttribute("name", "password");

        // Create the first span element
    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = "Please fill up your username";
    usernameSpan.style.display = "none";

    // Create the second span element
    const passwordSpan = document.createElement("span");
    passwordSpan.textContent = "Please fill up your password";
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
      event.preventDefault();
     const usernameInput = document.getElementById('username').value;
     const passwordInput = document.getElementById('password').value;

     const trimmedusernameInput = usernameInput.trim();
     const trimmedpasswordInput = passwordInput.trim();

     if(trimmedusernameInput === "") {
        usernameSpan.style.display = "block";
        event.preventDefault();
        
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
