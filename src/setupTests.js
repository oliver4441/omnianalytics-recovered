// Mock Firebase imports
import { vi } from 'vitest';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Mock Firebase functions
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  increment: vi.fn(),
}));

// Mock DOM environment
const originalDocumentCreateElement = document.createElement;

beforeAll(() => {
  // Mock createElement to handle custom elements
  document.createElement = (tagName) => {
    const element = originalDocumentCreateElement(tagName);
    if (tagName === 'canvas') {
      element.getContext = () => ({
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        transform: vi.fn(),
        setTransform: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createPattern: vi.fn(),
        measureText: vi.fn(),
        drawImage: vi.fn(),
        createImageData: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        getLineDash: vi.fn(),
        setLineDash: vi.fn(),
        lineDashOffset: vi.fn(),
      });
    }
    return element;
  };
});

afterAll(() => {
  document.createElement = originalDocumentCreateElement;
});

// Add global test utilities
global.render = () => {};
global.fireEvent = () => {};
global.waitFor = () => {};
global.waitForElementToBeRemoved = () => {};

// Extend expect with additional matchers
expect.extend({
  toBeInRange(received, min, max) {
    const pass = received >= min && received <= max;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be in range [${min}, ${max}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be in range [${min}, ${max}]`,
        pass: false,
      };
    }
  },
});
