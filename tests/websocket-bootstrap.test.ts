import { describe, expect, it, vi } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: () => ({ render: vi.fn() })
}));

vi.mock('../src/App.tsx', () => ({
  default: () => null
}));

describe('application bootstrap', () => {
  it('does not replace a getter-only native WebSocket property', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'WebSocket');
    const nativeWebSocket = window.WebSocket;

    Object.defineProperty(window, 'WebSocket', {
      configurable: true,
      enumerable: originalDescriptor?.enumerable ?? true,
      get: () => nativeWebSocket
    });

    try {
      await expect(import('../src/main.tsx')).resolves.toBeDefined();
      expect(Object.getOwnPropertyDescriptor(window, 'WebSocket')?.get).toBeTypeOf('function');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'WebSocket', originalDescriptor);
      }
    }
  });
});
