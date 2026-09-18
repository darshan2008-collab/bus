import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { user, token, selectedBusId } = useAuth();
  const [syncStatus, setSyncStatus] = useState('OFFLINE'); // SYNCED, SYNCING, OFFLINE
  const [coordinators, setCoordinators] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // External listeners subscribed to attendance events (e.g. from AttendancePage or Dashboard)
  const listenersRef = useRef(new Set());

  const registerListener = useCallback((cb) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  const notifyListeners = (event) => {
    listenersRef.current.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[Sync] Listener error:', err);
      }
    });
  };

  // Fetch initial coordinator status via REST API
  const refreshCoordinatorsStatus = useCallback(async (busId = selectedBusId) => {
    try {
      const data = await apiRequest(`/auth/coordinators-status?busId=${busId}`);
      if (data && data.coordinators) {
        setCoordinators(data.coordinators);
      }
    } catch (err) {
      console.warn('[Sync] Could not fetch coordinator status:', err.message);
    }
  }, [selectedBusId]);

  // Connect WebSocket
  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      setSyncStatus('SYNCING');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // When developing with Vite proxy, use /ws/sync
      const wsUrl = `${protocol}//${host}/ws/sync?busId=${selectedBusId}${token ? `&token=${token}` : ''}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log('[WS] Connected to sync server');
          setSyncStatus('SYNCED');
          refreshCoordinatorsStatus(selectedBusId);

          // Flush any offline pending marks
          if (pendingQueue.length > 0) {
            console.log(`[WS] Flushing ${pendingQueue.length} queued attendance records`);
            pendingQueue.forEach((item) => {
              ws.send(JSON.stringify({ type: 'MARK_ATTENDANCE', payload: item }));
            });
            setPendingQueue([]);
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'COORDINATORS_STATUS_UPDATE') {
              if (data.payload && data.payload.coordinators) {
                setCoordinators(data.payload.coordinators);
              }
            } else if (data.type === 'ATTENDANCE_UPDATED') {
              notifyListeners(data);
              // Also refresh coordinator marking count
              refreshCoordinatorsStatus(selectedBusId);
            } else if (data.type === 'STOP_ATTENDANCE_SUBMITTED') {
              notifyListeners(data);
              refreshCoordinatorsStatus(selectedBusId);
            }
          } catch (err) {
            console.error('[WS] Error processing incoming sync message:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.log('[WS] Disconnected, scheduling reconnect...');
          setSyncStatus('OFFLINE');
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setSyncStatus('OFFLINE');
        };
      } catch (err) {
        console.error('[WS] Connection exception:', err);
        setSyncStatus('OFFLINE');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedBusId, token, refreshCoordinatorsStatus]);

  // Method to mark attendance with real-time sync & optimistic local state
  const markAttendanceLive = async ({ student_id, bus_id, stop_id, attendance_date, status, session }) => {
    const payload = {
      student_id,
      bus_id: bus_id || selectedBusId,
      stop_id,
      attendance_date,
      status,
      session: session || 'MORNING'
    };

    // If WebSocket is open, send real-time
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'MARK_ATTENDANCE',
        payload
      }));
    } else {
      // Offline fallback: try REST or queue
      setPendingQueue((prev) => [...prev, payload]);
      try {
        await apiRequest('/attendance/mark', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('[Sync] Offline: Record saved to local pending sync queue');
      }
    }
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        coordinators,
        refreshCoordinatorsStatus,
        registerListener,
        markAttendanceLive,
        pendingQueueCount: pendingQueue.length
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
