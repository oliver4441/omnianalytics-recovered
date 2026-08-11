/**
 * Security Utils - Input validation, sanitization, and security functions
 */

// HTML sanitization to prevent XSS
export function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  projectName: /^[a-zA-Z0-9\s\-_.,!?()]{2,100}$/,
  logText: /^[\s\S]{1,1000}$/,
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  userId: /^[a-zA-Z0-9\-_]{1,128}$/,
  projectId: /^[a-zA-Z0-9\-_]{1,128}$/,
};

// Input validation function
export function validateInput(value, type) {
  const pattern = VALIDATION_PATTERNS[type];
  if (!pattern) {
    throw new Error(`Unknown validation type: ${type}`);
  }
  return pattern.test(value);
}

// Sanitize user input
export function sanitizeInput(value, type = 'text') {
  if (typeof value !== 'string') {
    return '';
  }

  // Trim whitespace
  value = value.trim();

  // Basic XSS prevention
  value = value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Additional validation based on type
  if (type !== 'text' && !validateInput(value, type)) {
    throw new Error(`Invalid ${type} format`);
  }

  return value;
}

// Rate limiting implementation
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      (time) => now - time < this.windowMs
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  clear(identifier) {
    this.requests.delete(identifier);
  }
}

// CSRF token management
export class CSRFProtection {
  constructor() {
    this.token = this.generateToken();
    this.setupToken();
  }

  generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  setupToken() {
    // Store token in session storage
    sessionStorage.setItem('csrf_token', this.token);

    // Add token to all forms
    document.addEventListener('DOMContentLoaded', () => {
      this.addTokensToForms();
    });
  }

  addTokensToForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      if (!form.querySelector('input[name="csrf_token"]')) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = this.token;
        form.appendChild(input);
      }
    });
  }

  validateToken(requestedToken) {
    const storedToken = sessionStorage.getItem('csrf_token');
    return requestedToken && storedToken && requestedToken === storedToken;
  }

  refreshToken() {
    this.token = this.generateToken();
    sessionStorage.setItem('csrf_token', this.token);
    this.addTokensToForms();
  }
}

// Content Security Policy helper
export function setupCSP() {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com",
    "font-src 'self' data:",
    "object-src 'none'",
    "media-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');

  document.head.appendChild(meta);
}

// Secure headers setup
export function setupSecureHeaders() {
  // Add security-related meta tags
  const securityHeaders = [
    { name: 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'X-Frame-Options', content: 'DENY' },
    { name: 'X-XSS-Protection', content: '1; mode=block' },
    { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
    {
      name: 'Permissions-Policy',
      content: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  securityHeaders.forEach((header) => {
    const meta = document.createElement('meta');
    meta.httpEquiv = header.name;
    meta.content = header.content;
    document.head.appendChild(meta);
  });
}

// Security event logging
export class SecurityLogger {
  static log(level, event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // In production, send to security monitoring service
    if (import.meta.env.PROD) {
      // Send to your security logging endpoint
      console.warn('Security Event:', logEntry);
    } else {
      console.debug('Security Event:', logEntry);
    }
  }

  static logSuspiciousActivity(event, details) {
    this.log('WARNING', event, details);
  }

  static logSecurityError(event, error) {
    this.log('ERROR', event, { error: error.message, stack: error.stack });
  }
}

// Input field security decorator
export function secureInputField(inputElement, options = {}) {
  const {
    type = 'text',
    maxLength = 1000,
    preventPaste = false,
    sanitizeOnInput = true,
  } = options;

  // Set maxlength
  if (maxLength) {
    inputElement.maxLength = maxLength;
  }

  // Prevent paste if specified
  if (preventPaste) {
    inputElement.addEventListener('paste', (e) => {
      e.preventDefault();
      SecurityLogger.logSuspiciousActivity('PASTE_ATTEMPT_BLOCKED', {
        element: inputElement.name || 'unknown',
      });
    });
  }

  // Sanitize input on the fly
  if (sanitizeOnInput) {
    inputElement.addEventListener('input', (e) => {
      try {
        e.target.value = sanitizeInput(e.target.value, type);
      } catch (error) {
        SecurityLogger.logSecurityError('INPUT_VALIDATION_ERROR', error);
        e.target.value = '';
      }
    });
  }

  // Validate on blur
  inputElement.addEventListener('blur', (e) => {
    try {
      validateInput(e.target.value, type);
    } catch (error) {
      SecurityLogger.logSuspiciousActivity('INVALID_INPUT_ATTEMPT', {
        value: e.target.value,
        type,
        element: inputElement.name || 'unknown',
      });
      e.target.classList.add('invalid');
    }
  });
}

// Initialize security measures
export function initializeSecurity() {
  // Setup CSP and security headers
  setupCSP();
  setupSecureHeaders();

  // Initialize CSRF protection
  const csrfProtection = new CSRFProtection();

  // Log security initialization
  SecurityLogger.log('INFO', 'SECURITY_INITIALIZED', {
    timestamp: new Date().toISOString(),
    features: [
      'CSP',
      'CSRF',
      'XSS_Protection',
      'Input_Validation',
      'Rate_Limiting',
    ],
  });

  // Initialize rate limiting
  window.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

  // Make CSRF protection globally available
  window.csrfProtection = csrfProtection;

  // Add security event listeners
  window.addEventListener('beforeunload', () => {
    SecurityLogger.log('INFO', 'PAGE_UNLOAD', {
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  });

  // Monitor for suspicious activity
  setInterval(() => {
    monitorSecurity();
  }, 30000); // Check every 30 seconds
}
