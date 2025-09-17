import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'development';
process.env.VITE_AWS_REGION = 'us-east-2';

// Mock window location for navigation tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:8083',
    origin: 'http://localhost:8083',
    pathname: '/',
    search: '',
    hash: '',
    replace: vi.fn(),
    assign: vi.fn()
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Setup global fetch mock
global.fetch = vi.fn();

// Mock import.meta.env for Vite
vi.mock('virtual:vite-env', () => ({
  MODE: 'development',
  DEV: true,
  PROD: false
}));

// Mock AWS Amplify to prevent initialization errors in tests
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
  signIn: vi.fn()
}));

// Mock React Router's useNavigate for component tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', state: null })
  };
});