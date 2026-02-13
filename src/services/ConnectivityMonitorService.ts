/**
 * ConnectivityMonitorService
 * Browser-only connectivity monitor with CORS-resilient probes.
 */

import { isVerboseLoggingEnabled } from '@/utils';

export type ConnectivityInternetStatus = 'unknown' | 'up' | 'down';

export interface ConnectivitySnapshot {
  browserOnline: boolean;
  internetStatus: ConnectivityInternetStatus;
  sipReachable: boolean | null;
  networkPathSignature: string;
  lastProbeAt: number | null;
  lastInternetUpAt: number | null;
  lastInternetDownAt: number | null;
  lastSipReachableAt: number | null;
  lastSipUnreachableAt: number | null;
}

export interface ConnectivityStateChangedEvent {
  previous: ConnectivitySnapshot;
  current: ConnectivitySnapshot;
  reason: string;
}

export type ConnectivityEventType =
  | 'stateChanged'
  | 'internetUp'
  | 'internetDown'
  | 'sipReachable'
  | 'sipUnreachable'
  | 'networkPathChanged';

export interface ConnectivityMonitorConfig {
  sipWebSocketUrl: string;
  internetProbeTimeoutMs?: number;
  sipProbeTimeoutMs?: number;
  healthyIntervalMs?: number;
  degradedIntervalMs?: number;
  requiredConsecutiveSuccesses?: number;
  requiredConsecutiveFailures?: number;
  imageProbeUrls?: string[];
  noCorsProbeUrls?: string[];
}

type ConnectivityListener<T = unknown> = (data: T) => void;

const DEFAULT_IMAGE_PROBE_URLS = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
  'https://www.microsoft.com/favicon.ico'
];

const DEFAULT_NOCORS_PROBE_URLS = [
  'https://www.gstatic.com/generate_204',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://www.msftconnecttest.com/connecttest.txt'
];

function withCacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function asFiniteNumber(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'na';
  }
  return String(value);
}

function getConnectionLike(): {
  effectiveType?: string;
  type?: string;
  rtt?: number;
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (event: string, handler: EventListener) => void;
  removeEventListener?: (event: string, handler: EventListener) => void;
} | null {
  const navigatorWithConnection = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      type?: string;
      rtt?: number;
      downlink?: number;
      saveData?: boolean;
      addEventListener?: (event: string, handler: EventListener) => void;
      removeEventListener?: (event: string, handler: EventListener) => void;
    };
    mozConnection?: {
      effectiveType?: string;
      type?: string;
      rtt?: number;
      downlink?: number;
      saveData?: boolean;
      addEventListener?: (event: string, handler: EventListener) => void;
      removeEventListener?: (event: string, handler: EventListener) => void;
    };
    webkitConnection?: {
      effectiveType?: string;
      type?: string;
      rtt?: number;
      downlink?: number;
      saveData?: boolean;
      addEventListener?: (event: string, handler: EventListener) => void;
      removeEventListener?: (event: string, handler: EventListener) => void;
    };
  };

  return navigatorWithConnection.connection || navigatorWithConnection.mozConnection || navigatorWithConnection.webkitConnection || null;
}

function getNetworkPathSignature(browserOnline: boolean): string {
  const connection = getConnectionLike();

  const effectiveType = connection?.effectiveType || 'unknown';
  const connectionType = connection?.type || 'unknown';
  const rtt = asFiniteNumber(connection?.rtt);
  const downlink = asFiniteNumber(connection?.downlink);
  const saveData = String(connection?.saveData ?? false);

  return `online:${browserOnline}|type:${connectionType}|eff:${effectiveType}|rtt:${rtt}|down:${downlink}|saveData:${saveData}`;
}

export class ConnectivityMonitorService {
  private config: ConnectivityMonitorConfig | null = null;
  private listeners: Map<ConnectivityEventType, Set<ConnectivityListener>> = new Map();

  private timer: number | null = null;
  private started = false;
  private checkInFlight = false;

  private consecutiveInternetSuccesses = 0;
  private consecutiveInternetFailures = 0;

  private snapshot: ConnectivitySnapshot = {
    browserOnline: navigator.onLine,
    internetStatus: 'unknown',
    sipReachable: null,
    networkPathSignature: getNetworkPathSignature(navigator.onLine),
    lastProbeAt: null,
    lastInternetUpAt: null,
    lastInternetDownAt: null,
    lastSipReachableAt: null,
    lastSipUnreachableAt: null
  };

  private readonly handleOnline = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 🌐 Browser online event received');
    }

    this.updateSnapshot({ browserOnline: true }, 'browser-online-event');
    this.runHealthCheck('browser-online-event').catch((error) => {
      console.error('[ConnectivityMonitorService] ❌ Error running health check after online event:', error);
    });
  };

  private readonly handleOffline = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 📵 Browser offline event received');
    }

    this.consecutiveInternetFailures += 1;
    this.consecutiveInternetSuccesses = 0;

    this.updateSnapshot(
      {
        browserOnline: false,
        internetStatus: 'down',
        sipReachable: false,
        lastProbeAt: Date.now(),
        lastInternetDownAt: Date.now(),
        lastSipUnreachableAt: Date.now()
      },
      'browser-offline-event'
    );

    this.restartTimer('browser-offline-event');
  };

  private readonly handleVisibilityChange = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (document.visibilityState === 'visible') {
      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] 👀 Document visible - triggering immediate health check');
      }

      this.runHealthCheck('document-visible').catch((error) => {
        console.error('[ConnectivityMonitorService] ❌ Error running health check on visibility change:', error);
      });
    }
  };

  private readonly handleConnectionChange = (): void => {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 🔄 NetworkInformation change event received');
    }

    this.refreshNetworkPathSignature('network-information-change');
    this.runHealthCheck('network-information-change').catch((error) => {
      console.error('[ConnectivityMonitorService] ❌ Error running health check on NetworkInformation change:', error);
    });
  };

  on<E extends ConnectivityEventType>(event: E, callback: ConnectivityListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  off<E extends ConnectivityEventType>(event: E, callback: ConnectivityListener): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit<E extends ConnectivityEventType>(event: E, data: unknown): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 📢 Emitting event:', {
        event,
        listenerCount: this.listeners.get(event)?.size || 0
      });
    }

    const callbacks = this.listeners.get(event);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('[ConnectivityMonitorService] ❌ Error in event listener:', { event, error });
      }
    });
  }

  start(config: ConnectivityMonitorConfig): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 🚀 start() called:', {
        alreadyStarted: this.started,
        sipWebSocketUrl: config.sipWebSocketUrl,
        healthyIntervalMs: config.healthyIntervalMs,
        degradedIntervalMs: config.degradedIntervalMs
      });
    }

    this.config = {
      ...config,
      internetProbeTimeoutMs: config.internetProbeTimeoutMs ?? 4000,
      sipProbeTimeoutMs: config.sipProbeTimeoutMs ?? 4500,
      healthyIntervalMs: config.healthyIntervalMs ?? 15000,
      degradedIntervalMs: config.degradedIntervalMs ?? 4000,
      requiredConsecutiveSuccesses: config.requiredConsecutiveSuccesses ?? 2,
      requiredConsecutiveFailures: config.requiredConsecutiveFailures ?? 2,
      imageProbeUrls: config.imageProbeUrls ?? DEFAULT_IMAGE_PROBE_URLS,
      noCorsProbeUrls: config.noCorsProbeUrls ?? DEFAULT_NOCORS_PROBE_URLS
    };

    this.snapshot = {
      ...this.snapshot,
      browserOnline: navigator.onLine,
      networkPathSignature: getNetworkPathSignature(navigator.onLine)
    };

    if (!this.started) {
      this.started = true;
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);

      const connection = getConnectionLike();
      connection?.addEventListener?.('change', this.handleConnectionChange);

      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] 👀 Browser listeners attached');
      }
    }

    this.restartTimer('start');
    this.runHealthCheck('start').catch((error) => {
      console.error('[ConnectivityMonitorService] ❌ Initial health check failed:', error);
    });
  }

  stop(): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 🛑 stop() called:', {
        started: this.started,
        hasTimer: this.timer !== null
      });
    }

    if (!this.started) {
      return;
    }

    this.started = false;

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    const connection = getConnectionLike();
    connection?.removeEventListener?.('change', this.handleConnectionChange);

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getSnapshot(): ConnectivitySnapshot {
    return { ...this.snapshot };
  }

  async requestImmediateCheck(reason = 'manual-request'): Promise<ConnectivitySnapshot> {
    await this.runHealthCheck(reason);
    return this.getSnapshot();
  }

  private restartTimer(reason: string): void {
    const verboseLogging = isVerboseLoggingEnabled();

    if (!this.config || !this.started) {
      return;
    }

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    const intervalMs = this.snapshot.internetStatus === 'up'
      ? this.config.healthyIntervalMs!
      : this.config.degradedIntervalMs!;

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] ⏱️ Scheduling next health check:', {
        reason,
        intervalMs,
        internetStatus: this.snapshot.internetStatus
      });
    }

    this.timer = window.setTimeout(() => {
      this.runHealthCheck('scheduled-timer').catch((error) => {
        console.error('[ConnectivityMonitorService] ❌ Scheduled health check failed:', error);
      });
    }, intervalMs);
  }

  private async runHealthCheck(reason: string): Promise<void> {
    const verboseLogging = isVerboseLoggingEnabled();

    if (!this.config || !this.started) {
      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] ℹ️ runHealthCheck skipped - service not started/configured', { reason });
      }
      return;
    }

    if (this.checkInFlight) {
      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] ℹ️ runHealthCheck skipped - check already in flight', { reason });
      }
      return;
    }

    this.checkInFlight = true;

    try {
      this.refreshNetworkPathSignature(`pre-check:${reason}`);

      const browserOnline = navigator.onLine;
      if (!browserOnline) {
        if (verboseLogging) {
          console.log('[ConnectivityMonitorService] 📵 Browser reports offline - forcing internet down state');
        }

        this.consecutiveInternetFailures += 1;
        this.consecutiveInternetSuccesses = 0;

        this.updateSnapshot(
          {
            browserOnline: false,
            internetStatus: 'down',
            sipReachable: false,
            lastProbeAt: Date.now(),
            lastInternetDownAt: Date.now(),
            lastSipUnreachableAt: Date.now()
          },
          `offline-short-circuit:${reason}`
        );

        return;
      }

      const internetReachableNow = await this.checkInternetReachability();
      let internetStatusNext = this.snapshot.internetStatus;

      if (internetReachableNow) {
        this.consecutiveInternetSuccesses += 1;
        this.consecutiveInternetFailures = 0;

        if (this.consecutiveInternetSuccesses >= this.config.requiredConsecutiveSuccesses!) {
          internetStatusNext = 'up';
        }
      } else {
        this.consecutiveInternetFailures += 1;
        this.consecutiveInternetSuccesses = 0;

        if (this.consecutiveInternetFailures >= this.config.requiredConsecutiveFailures!) {
          internetStatusNext = 'down';
        }
      }

      let sipReachableNow: boolean | null = this.snapshot.sipReachable;

      if (internetStatusNext === 'up') {
        sipReachableNow = await this.checkSipWebSocketReachability(this.config.sipWebSocketUrl);
      } else if (internetStatusNext === 'down') {
        sipReachableNow = false;
      }

      this.updateSnapshot(
        {
          browserOnline,
          internetStatus: internetStatusNext,
          sipReachable: sipReachableNow,
          lastProbeAt: Date.now(),
          lastInternetUpAt: internetStatusNext === 'up' ? Date.now() : this.snapshot.lastInternetUpAt,
          lastInternetDownAt: internetStatusNext === 'down' ? Date.now() : this.snapshot.lastInternetDownAt,
          lastSipReachableAt: sipReachableNow === true ? Date.now() : this.snapshot.lastSipReachableAt,
          lastSipUnreachableAt: sipReachableNow === false ? Date.now() : this.snapshot.lastSipUnreachableAt
        },
        `health-check:${reason}`
      );

      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] ✅ Health check completed:', {
          reason,
          browserOnline,
          internetReachableNow,
          internetStatusNext,
          sipReachableNow,
          consecutiveInternetSuccesses: this.consecutiveInternetSuccesses,
          consecutiveInternetFailures: this.consecutiveInternetFailures
        });
      }
    } finally {
      this.checkInFlight = false;
      this.restartTimer(`post-check:${reason}`);
    }
  }

  private refreshNetworkPathSignature(reason: string): void {
    const nextSignature = getNetworkPathSignature(navigator.onLine);

    if (nextSignature !== this.snapshot.networkPathSignature) {
      const previousSnapshot = this.getSnapshot();
      this.snapshot.networkPathSignature = nextSignature;

      this.emit('networkPathChanged', {
        previous: previousSnapshot.networkPathSignature,
        current: nextSignature,
        reason
      });

      this.emit('stateChanged', {
        previous: previousSnapshot,
        current: this.getSnapshot(),
        reason: `network-path-signature-changed:${reason}`
      } satisfies ConnectivityStateChangedEvent);
    }
  }

  private updateSnapshot(partial: Partial<ConnectivitySnapshot>, reason: string): void {
    const previous = this.getSnapshot();

    this.snapshot = {
      ...this.snapshot,
      ...partial,
      networkPathSignature: getNetworkPathSignature(partial.browserOnline ?? this.snapshot.browserOnline)
    };

    const current = this.getSnapshot();

    const hasChanged = JSON.stringify(previous) !== JSON.stringify(current);
    if (!hasChanged) {
      return;
    }

    this.emit('stateChanged', {
      previous,
      current,
      reason
    } satisfies ConnectivityStateChangedEvent);

    if (previous.internetStatus !== current.internetStatus) {
      if (current.internetStatus === 'up') {
        this.emit('internetUp', { current, reason });
      } else if (current.internetStatus === 'down') {
        this.emit('internetDown', { current, reason });
      }
    }

    if (previous.sipReachable !== current.sipReachable) {
      if (current.sipReachable === true) {
        this.emit('sipReachable', { current, reason });
      } else if (current.sipReachable === false) {
        this.emit('sipUnreachable', { current, reason });
      }
    }

    if (previous.networkPathSignature !== current.networkPathSignature) {
      this.emit('networkPathChanged', {
        previous: previous.networkPathSignature,
        current: current.networkPathSignature,
        reason
      });
    }
  }

  private async checkInternetReachability(): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();

    if (!this.config) {
      return false;
    }

    const timeoutMs = this.config.internetProbeTimeoutMs!;
    const imageUrls = this.config.imageProbeUrls || [];
    const noCorsUrls = this.config.noCorsProbeUrls || [];

    const imageChecks = imageUrls.map((url) => this.runImageProbe(url, timeoutMs));
    const noCorsChecks = noCorsUrls.map((url) => this.runNoCorsProbe(url, timeoutMs));

    const results = await Promise.allSettled([...imageChecks, ...noCorsChecks]);
    const normalized = results.map((result) => (result.status === 'fulfilled' ? result.value : false));
    const successCount = normalized.filter(Boolean).length;
    const quorum = Math.max(2, Math.ceil(normalized.length * 0.5));
    const internetReachable = successCount >= quorum;

    if (verboseLogging) {
      console.log('[ConnectivityMonitorService] 🌍 Internet probe results:', {
        totalChecks: normalized.length,
        successCount,
        quorum,
        internetReachable,
        probeResults: normalized
      });
    }

    return internetReachable;
  }

  private runImageProbe(url: string, timeoutMs: number): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();

    return new Promise<boolean>((resolve) => {
      const probeUrl = withCacheBust(url);
      const image = new Image();
      let settled = false;

      const cleanup = (): void => {
        image.onload = null;
        image.onerror = null;
      };

      const finish = (success: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(success);
      };

      const timeout = window.setTimeout(() => {
        if (verboseLogging) {
          console.warn('[ConnectivityMonitorService] ⏱️ Image probe timeout', { url: probeUrl, timeoutMs });
        }
        finish(false);
      }, timeoutMs);

      image.onload = () => {
        window.clearTimeout(timeout);
        if (verboseLogging) {
          console.log('[ConnectivityMonitorService] ✅ Image probe success', { url: probeUrl });
        }
        finish(true);
      };

      image.onerror = () => {
        window.clearTimeout(timeout);
        if (verboseLogging) {
          console.warn('[ConnectivityMonitorService] ❌ Image probe failed', { url: probeUrl });
        }
        finish(false);
      };

      image.referrerPolicy = 'no-referrer';
      image.src = probeUrl;
    });
  }

  private async runNoCorsProbe(url: string, timeoutMs: number): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const probeUrl = withCacheBust(url);
      await fetch(probeUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });

      if (verboseLogging) {
        console.log('[ConnectivityMonitorService] ✅ no-cors probe resolved', { url: probeUrl });
      }

      return true;
    } catch (error) {
      if (verboseLogging) {
        console.warn('[ConnectivityMonitorService] ❌ no-cors probe failed', {
          url,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private checkSipWebSocketReachability(sipWebSocketUrl: string): Promise<boolean> {
    const verboseLogging = isVerboseLoggingEnabled();

    return new Promise<boolean>((resolve) => {
      const timeoutMs = this.config?.sipProbeTimeoutMs ?? 4500;
      const startedAt = Date.now();
      let settled = false;
      let socket: WebSocket | null = null;

      const finish = (success: boolean): void => {
        if (settled) {
          return;
        }

        settled = true;

        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'connectivity-probe-complete');
        }

        if (verboseLogging) {
          console.log('[ConnectivityMonitorService] 🔌 SIP WebSocket probe completed', {
            sipWebSocketUrl,
            success,
            durationMs: Date.now() - startedAt
          });
        }

        resolve(success);
      };

      const timeout = window.setTimeout(() => {
        if (verboseLogging) {
          console.warn('[ConnectivityMonitorService] ⏱️ SIP WebSocket probe timeout', {
            sipWebSocketUrl,
            timeoutMs
          });
        }
        finish(false);
      }, timeoutMs);

      try {
        socket = new WebSocket(sipWebSocketUrl, 'sip');

        socket.onopen = () => {
          window.clearTimeout(timeout);
          finish(true);
        };

        socket.onerror = () => {
          window.clearTimeout(timeout);
          finish(false);
        };

        socket.onclose = () => {
          if (!settled) {
            window.clearTimeout(timeout);
            finish(false);
          }
        };
      } catch (error) {
        window.clearTimeout(timeout);

        if (verboseLogging) {
          console.error('[ConnectivityMonitorService] ❌ SIP WebSocket probe exception', {
            sipWebSocketUrl,
            error: error instanceof Error ? error.message : String(error)
          });
        }

        finish(false);
      }
    });
  }
}

export const connectivityMonitorService = new ConnectivityMonitorService();
