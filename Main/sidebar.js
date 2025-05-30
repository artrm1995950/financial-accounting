const btn = document.querySelector('.theme-toggle');
const sidebar = document.querySelector('.sidebar');
let dark = true;
btn.addEventListener('click', () => {
  dark = !dark;
  if (dark) {
    sidebar.style.backgroundColor = '#1e1e2f';
    btn.textContent = 'Темная';
  } else {
    sidebar.style.backgroundColor = '#ffffff';
    sidebar.style.color = '#000000';
    document.querySelectorAll('.menu-item').forEach(item => item.style.color = '#333333');
    btn.textContent = 'Светлая';
  }
});
