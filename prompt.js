const ta = $0 || document.querySelector('textarea');
ta.value = 'Chill deep voice song about friday night lights';
ta.dispatchEvent(new Event('input', { bubbles: true }));
document.querySelectorAll('button').forEach(b => {
  if (b.textContent.toLowerCase().includes('create')) b.click();
});
