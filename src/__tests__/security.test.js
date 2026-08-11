import { describe, it, expect, vi } from 'vitest'';
import {
  validateProjectData,
  sanitizeInput,
  validateEmail,
  validatePassword,
  checkProjectPermissions,
} from '../security.js';

describe('Security Module', () => {
  describe('validateProjectData', () => {
    it('should validate project data successfully', () => {
      const mockProjectData = {
        name: 'Test Project',
        description: 'Test description',
        deadline: new Date().toISOString(),
        priority: 'medium'
      };

      const result = validateProjectData(mockProjectData);

      expect(result).toBe(true);
    });

    it('should reject invalid project data', () => {
      const mockProjectData = {
        name: '', // Empty name
        description: 'a'.repeat(5000), // Too long
        deadline: 'invalid-date',
        priority: 'invalid-priority'
      };

      expect(() => validateProjectData(mockProjectData)).toThrow();
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input string', () => {
      const mockInput = '<script>alert('xss');</script>';
      const result = sanitizeInput(mockInput);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should handle null input', () => {
      const result = sanitizeInput(null);
      expect(result).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email', () => {
      const validEmail = 'test@example.com';
      const result = validateEmail(validEmail);

      expect(result).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidEmail = 'invalid-email';
      expect(() => validateEmail(invalidEmail)).toThrow();
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'Password123!';
      const result = validatePassword(strongPassword);

      expect(result).toBe(true);
    });

    it('should reject weak password', () => {
      const weakPassword = 'password';
      expect(() => validatePassword(weakPassword)).toThrow();
    });
  });

  describe('checkProjectPermissions', () => {
    it('should allow access when user owns project', () => {
      const mockUserUid = 'test-user';
      const mockProject = { userId: 'test-user' };

      const result = checkProjectPermissions(mockUserUid, mockProject);

      expect(result).toBe(true);
    });

    it('should deny access when user does not own project', () => {
      const mockUserUid = 'test-user';
      const mockProject = { userId: 'other-user' };

      expect(() => checkProjectPermissions(mockUserUid, mockProject)).toThrow();
    });
  });
});