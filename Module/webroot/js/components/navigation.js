// Navigation Component
document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".m3-floating-nav a, nav.bottom a, .toolbar a");
  const pages = document.querySelectorAll(".page");

  links.forEach((link, idx) => {
    link.addEventListener("click", () => {
      links.forEach(l => l.classList.remove("active"));
      pages.forEach(p => p.classList.remove("active"));
      link.classList.add("active");
      if (pages[idx]) {
        pages[idx].classList.add("active");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
});
