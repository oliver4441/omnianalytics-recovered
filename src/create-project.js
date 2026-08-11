import { getCurrentUser, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase.js';
import { createProject } from './project.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  const form = document.getElementById('projectForm');
  const message = document.getElementById('message');

  if (!form || !message) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectName = document.getElementById('projectName').value;
    const description = document.getElementById('description').value;
    const targetDate = document.getElementById('targetDate').value;

    try {
      const projectData = {
        name: projectName,
        description: description,
        targetDate: targetDate ? new Date(targetDate) : null,
      };

      await createProject(user.uid, projectData);

      message.className = 'message success';
      message.textContent = 'Project created successfully! Redirecting...';

      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      message.className = 'message error';
      message.textContent = error.message;
    }
  });

  // Add back button functionality
  const backLink = document.querySelector('.back-link');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.back();
    });
  }
});
