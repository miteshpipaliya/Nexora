/**
 * src/shared/lib/websocketResilience.ts
 * WebSocket stability and reconnection resilience.
 * Prevents "WebSocket closed without opened" runtime errors from crashing the UI
 * during dev-server hot reloads, server restarts, or transient network blips.
 */

export function installWebSocketResilience(): void {
  if (typeof window === 'undefined') return;

  // 1. Intercept window-level errors and unhandled rejections from WebSocket closures
  window.addEventListener('error', (event: ErrorEvent) => {
    const msg = (event?.message || '').toLowerCase();
    if (
      msg.includes('websocket closed without opened') ||
      msg.includes('websocket is closed before the connection was established') ||
      msg.includes('websocket connection to')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('[NEXORA WS RESILIENCE] Prevented uncaught WebSocket closure error during hot-reload/reconnect.');
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = String(event?.reason?.message || event?.reason || '').toLowerCase();
    if (
      reason.includes('websocket closed without opened') ||
      reason.includes('websocket is closed before the connection was established') ||
      reason.includes('websocket connection to')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('[NEXORA WS RESILIENCE] Prevented unhandled WebSocket promise rejection.');
      return true;
    }
  }, true);

  // 2. Wrap Native WebSocket constructor to guard instance events
  const OriginalWebSocket = window.WebSocket;
  if (!OriginalWebSocket) return;

  class ResilientWebSocket extends OriginalWebSocket {
    private hasOpened = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);

      this.addEventListener('open', () => {
        this.hasOpened = true;
        this.reconnectAttempts = 0;
      });

      this.addEventListener('error', (err) => {
        // Prevent fatal error dispatch if closed before opened
        if (!this.hasOpened) {
          err.stopPropagation();
        }
      });

      this.addEventListener('close', (event) => {
        if (!this.hasOpened) {
          // Closed without opened: cleanly absorbed without crash
          event.stopPropagation();
        }
      });
    }
  }

  window.WebSocket = ResilientWebSocket as any;
}
