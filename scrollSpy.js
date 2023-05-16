
    // Get all section links
    const sectionLinks = document.querySelectorAll('.section');

    // Scrollspy function
    function scrollSpy() {
      const scrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

      // Loop through each section
      sectionLinks.forEach((link) => {
        const target = document.querySelector(link.getAttribute('href'));

        if (target.offsetTop <= scrollPosition && target.offsetTop + target.offsetHeight > scrollPosition) {
          // Add active class to the current section link
          link.classList.add('active');
        } else {
          // Remove active class from the other section links
          link.classList.remove('active');
        }
      });
    }

    // Add scroll event listener
    window.addEventListener('scroll', scrollSpy);