document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuButton = document.querySelector('#menu-button');
  const mobileMenu = document.querySelector('#mobile-menu');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Service Filter
  const filterInput = document.querySelector('#service-filter');
  const serviceCards = document.querySelectorAll('.service-card');
  if (filterInput && serviceCards) {
    filterInput.addEventListener('input', (e) => {
      const filter = e.target.value.toLowerCase();
      serviceCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        card.style.display = title.includes(filter) ? 'block' : 'none';
      });
    });
  }
});