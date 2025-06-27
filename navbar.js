document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".dropdown-toggle");
  const menu = document.querySelector(".dropdown-menu");

  if (toggle && menu) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", () => {
      menu.style.display = "none";
    });
  }
});
