(() => {
  const dialog = document.getElementById('group-members');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  for (const link of document.querySelectorAll('a.group-link')) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a.group-link');
    if (!link) return;

    const group = document.getElementById(link.hash.slice(1));
    if (!group) return;

    document.getElementById('group-dialog-title').textContent = group.querySelector('h3').textContent.trim();
    document.getElementById('group-dialog-roster').replaceChildren(group.querySelector('.name-list').cloneNode(true));
    document.getElementById('group-dialog-assignments').replaceChildren(group.querySelector('.group-route').cloneNode(true));
    event.preventDefault();
    dialog.showModal();
  });

  dialog.querySelector('.group-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
})();
