import { register, createUserProfile, getCurrentUser } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (user) {
    window.location.href = '/';
    return;
  }

  const form = document.getElementById('registerForm');
  const message = document.getElementById('message');

  if (!form || !message) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('displayName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Creating account...</span>';

    try {
      const userCredential = await register(email, password);
      await createUserProfile(userCredential.user.uid, {
        email,
        displayName,
      });

      message.className = 'message success';
      message.textContent = 'Account created! Redirecting to dashboard...';

      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      message.className = 'message error';
      message.textContent =
        error.message || 'An error occurred. Please try again.';
      submitBtn.disabled = false;
      submitBtn.innerHTML =
        '<span>Create Account</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
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
