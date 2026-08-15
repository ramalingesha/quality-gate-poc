const trigger = document.querySelector('#account-menu-trigger');
const menu = document.querySelector('#account-menu');

if (!trigger || !menu) {
  throw new Error('Account menu markup is missing.');
}

trigger.addEventListener('click', () => {
  const willOpen = menu.hidden;
  menu.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
});
