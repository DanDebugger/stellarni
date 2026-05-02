import { useState, useEffect } from 'react';
import { isAllowed, setAllowed, requestAccess, getAddress } from '@stellar/freighter-api';

const AUTO_CONNECT_KEY = 'stellarni_auto_connect';

export function useFreighter() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initConnection = async () => {
      try {
        setIsConnecting(true);
        // Add a small safety check for Freighter extension
        if (typeof window === 'undefined') return;
        
        // Use a small delay to let extension initialize
        await new Promise(r => setTimeout(r, 100));

        if (await isAllowed()) {
          const res = await getAddress();
          if (mounted && res.address) {
            setPublicKey(res.address);
          }
          return;
        }

        // Auto-reconnect if user previously connected this app.
        if (localStorage.getItem(AUTO_CONNECT_KEY) === '1') {
          // Wrapped in try/catch to prevent blocking the app if Freighter fails
          try {
            await setAllowed();
            const access = await requestAccess();
            if (!access.error) {
              const res = await getAddress();
              if (mounted && res.address) {
                setPublicKey(res.address);
              }
            }
          } catch (innerError) {
            console.warn('Freighter auto-connect failed:', innerError);
          }
        }
      } catch (e) {
        // Specifically catch the "Could not establish connection" error to avoid crashing
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('Could not establish connection')) {
          console.warn('Freighter connection not yet available.');
        } else {
          console.error('Freighter initialization error:', e);
        }
      } finally {
        if (mounted) setIsConnecting(false);
      }
    };

    initConnection();

    return () => {
      mounted = false;
    };
  }, []);

  const connect = async () => {
    if (isConnecting) return null;
    setError(null);
    setIsConnecting(true);
    try {
      await setAllowed();
      const access = await requestAccess();
      if (access.error) {
        setError(access.error);
        return null;
      }
      const res = await getAddress();
      if (res.address) {
        setPublicKey(res.address);
        localStorage.setItem(AUTO_CONNECT_KEY, '1');
        return res.address;
      }
      return null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect Freighter';
      setError(msg);
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setPublicKey(null);
    localStorage.removeItem(AUTO_CONNECT_KEY);
  };

  return { publicKey, connect, disconnect, error, isConnecting };
}
