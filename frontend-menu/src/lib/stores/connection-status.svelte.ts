class ConnectionStatus {
  isOnline = $state(true);
  showBackOnline = $state(false);
  private _wasOffline = false;
  private _wsDisconnectedLong = $state(false);
  private _wsTimer: ReturnType<typeof setTimeout> | null = null;
  private _dismissTimer: ReturnType<typeof setTimeout> | null = null;

  // Combines navigator.onLine AND WS state
  isOffline = $derived(!this.isOnline || this._wsDisconnectedLong);

  init() {
    this.isOnline = navigator.onLine;

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this._wasOffline = true;
      // Clear any "back online" toast
      if (this._dismissTimer) {
        clearTimeout(this._dismissTimer);
        this._dismissTimer = null;
      }
      this.showBackOnline = false;
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this._wasOffline) {
        this.showBackOnline = true;
        this._dismissTimer = setTimeout(() => {
          this.showBackOnline = false;
        }, 3000);
      }
      // Import menuSync lazily to avoid circular dep at module level
      import('$lib/services/version-sync').then(({ menuSync }) => {
        menuSync.reconnectNow();
      });
    });
  }

  setWsConnected(connected: boolean) {
    if (connected) {
      // WS connected — clear disconnect timer
      if (this._wsTimer) {
        clearTimeout(this._wsTimer);
        this._wsTimer = null;
      }
      if (this._wsDisconnectedLong) {
        this._wsDisconnectedLong = false;
        // If we were showing offline due to WS, show back-online toast
        if (this.isOnline) {
          this.showBackOnline = true;
          this._dismissTimer = setTimeout(() => {
            this.showBackOnline = false;
          }, 3000);
        }
      }
    } else {
      // WS disconnected — wait 5s before showing offline
      if (!this._wsTimer) {
        this._wsTimer = setTimeout(() => {
          this._wsDisconnectedLong = true;
          this._wasOffline = true;
        }, 5000);
      }
    }
  }
}

export const connectionStatus = new ConnectionStatus();
