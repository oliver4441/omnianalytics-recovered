import { describe, it, expect, vi } from 'vitest'';
import {
  watchAuth,
  getCurrentUser,
  logout,
  login,
  register,
} from '../auth.js';

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', () => {
      const mockUser = { uid: 'test-user', email: 'test@example.com' };
      vi.mocked(getAuth).mockReturnValue({ currentUser: mockUser });

      const result = getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user authenticated', () => {
      vi.mocked(getAuth).mockReturnValue({ currentUser: null });

      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('watchAuth', () => {
    it('should call callback when auth state changes', () => {
      const mockCallback = vi.fn();
      const mockUser = { uid: 'test-user' };

      vi.mocked(onAuthStateChanged).mockImplementation((_, callback) => {
        callback(mockUser);
      });

      watchAuth(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockUser);
      expect(onAuthStateChanged).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);

      await logout();

      expect(signOut).toHaveBeenCalled();
    });

    it('should handle logout error', async () => {
      vi.mocked(signOut).mockRejectedValue(new Error('Network error'));

      await expect(logout()).rejects.toThrow('Network error');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'password123';
      const mockUser = { uid: 'test-user', email: mockEmail };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: mockUser });

      const result = await login(mockEmail, mockPassword);

      expect(result).toEqual(mockUser);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        mockEmail,
        mockPassword
      );
    });

    it('should handle login error', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'password123';

      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('Invalid credentials'));

      await expect(login(mockEmail, mockPassword)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'password123';
      const mockUser = { uid: 'test-user', email: mockEmail };

      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: mockUser });

      const result = await register(mockEmail, mockPassword);

      expect(result).toEqual(mockUser);
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        mockEmail,
        mockPassword
      );
    });

    it('should handle registration error', async () => {
      const mockEmail = 'test@example.com';
      const mockPassword = 'password123';

      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(new Error('Email already in use'));

      await expect(register(mockEmail, mockPassword)).rejects.toThrow('Email already in use');
    });
  });
});