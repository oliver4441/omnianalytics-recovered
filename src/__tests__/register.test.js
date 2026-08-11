import { describe, it, expect, vi } from 'vitest'';
import {
  handleRegister,
  handleLogin,
  validateRegistrationForm,
  validateLoginForm,
  showRegistrationSuccess,
  showLoginError,
} from '../register.js';
import {
  handleLogin as handleLoginModule,
  validateLoginForm as validateLoginFormModule,
  showLoginError as showLoginErrorModule,
  showLoginSuccess,
} from '../login.js';
describe('Register Module', () => {
  describe('handleRegister', () => {
    it('should handle registration successfully', async () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        target: {
          email: { value: 'test@example.com' },
          password: { value: 'Password123!' },
          confirmPassword: { value: 'Password123!' }
        }
      };

      vi.mocked(register).mockResolvedValue({ uid: 'test-user' });
      vi.mocked(showRegistrationSuccess).mockImplementation(() => {});

      await handleRegister(mockEvent);

      expect(register).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
      expect(showRegistrationSuccess).toHaveBeenCalled();
    });

    it('should handle registration error', async () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        target: {
          email: { value: 'test@example.com' },
          password: { value: 'Password123!' },
          confirmPassword: { value: 'Password123!' }
        }
      };

      vi.mocked(register).mockRejectedValue(new Error('Email already in use'));

      await expect(handleRegister(mockEvent)).rejects.toThrow('Email already in use');
    });
  });

  describe('validateRegistrationForm', () => {
    it('should validate valid registration form', () => {
      const mockForm = {
        email: { value: 'test@example.com' },
        password: { value: 'Password123!' },
        confirmPassword: { value: 'Password123!' }
      };

      const result = validateRegistrationForm(mockForm);

      expect(result).toBe(true);
    });

    it('should reject invalid registration form', () => {
      const mockForm = {
        email: { value: 'invalid-email' },
        password: { value: 'weak' },
        confirmPassword: { value: 'different' }
      };

      expect(() => validateRegistrationForm(mockForm)).toThrow();
    });
  });
});

describe('Login Module', () => {
  describe('handleLogin', () => {
    it('should handle login successfully', async () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        target: {
          email: { value: 'test@example.com' },
          password: { value: 'Password123!' }
        }
      };

      vi.mocked(login).mockResolvedValue({ uid: 'test-user' });
      vi.mocked(showLoginSuccess).mockImplementation(() => {});

      await handleLogin(mockEvent);

      expect(login).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
      expect(showLoginSuccess).toHaveBeenCalled();
    });

    it('should handle login error', async () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        target: {
          email: { value: 'test@example.com' },
          password: { value: 'Password123!' }
        }
      };

      vi.mocked(login).mockRejectedValue(new Error('Invalid credentials'));
      vi.mocked(showLoginError).mockImplementation(() => {});

      await handleLogin(mockEvent);

      expect(showLoginError).toHaveBeenCalled();
    });
  });

  describe('validateLoginForm', () => {
    it('should validate valid login form', () => {
      const mockForm = {
        email: { value: 'test@example.com' },
        password: { value: 'Password123!' }
      };

      const result = validateLoginForm(mockForm);

      expect(result).toBe(true);
    });

    it('should reject invalid login form', () => {
      const mockForm = {
        email: { value: 'invalid-email' },
        password: { value: '' }
      };

      expect(() => validateLoginForm(mockForm)).toThrow();
    });
  });
});