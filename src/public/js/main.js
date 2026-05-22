// Mark active sidebar link based on current path
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('#sidebar .nav-link').forEach((link) => {
    if (link.getAttribute('href') !== '/dashboard' && path.startsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
});
