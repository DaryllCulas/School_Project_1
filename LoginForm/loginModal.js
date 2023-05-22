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

    // Create the img element
    var img = document.createElement("img");
    img.src = "LoginForm/person.jpg";
    img.alt = "Login_icon";
    img.height = "100px";

    // Append the img element to a parent element in the DOM
    var parentElement = link.parentElement;
    parentElement.appendChild(img);

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

    var submitBtn = document.createElement("input");
    submitBtn.setAttribute("type", "submit");
    submitBtn.setAttribute("value", "Login");

    // Append the elements to the modal
    form.appendChild(usernameLabel);
    form.appendChild(usernameInput);
    form.appendChild(document.createElement("br"));
    form.appendChild(document.createElement("br"));
    form.appendChild(passwordLabel);
    form.appendChild(passwordInput);
    form.appendChild(document.createElement("br"));
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
  });
});
