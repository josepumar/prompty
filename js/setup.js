function mountSetup(onComplete) {
  const form = document.getElementById('setup-form');
  const errorEl = document.getElementById('setup-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();

    errorEl.classList.add('hidden');
    try {
      initSupabase(url, key);
      onComplete();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}
