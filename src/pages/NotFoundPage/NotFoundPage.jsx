import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../Pages.css';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <p>Page not found</p>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );
}

export default NotFoundPage;
