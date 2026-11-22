(() => {
  const switcher = document.getElementById('portal-switch');
  const select = switcher.querySelector('select');
  select.addEventListener('change', () => location.assign(select.value));
})();
