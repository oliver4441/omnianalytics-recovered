import { watchAuth, getCurrentUser, login } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (user) {
    window.location.href = '/';
    return;
  }

  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');

  if (!form || !message) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing in...</span>';

    try {
      await login(email, password);
      message.className = 'message success';
      message.textContent = 'Welcome back! Redirecting to dashboard...';

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      message.className = 'message error';
      message.textContent =
        error.message || 'Login failed. Please check your credentials.';
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<span>Sign In</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
  });

  const togglePasswordBtn = document.querySelector('.toggle-password');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
    });
  }
});
