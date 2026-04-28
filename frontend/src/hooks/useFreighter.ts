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
        if (await isAllowed()) {
          const res = await getAddress();
          if (mounted && res.address) {
            setPublicKey(res.address);
          }
          return;
        }

        // Auto-reconnect if user previously connected this app.
        if (localStorage.getItem(AUTO_CONNECT_KEY) === '1') {
          await setAllowed();
          const access = await requestAccess();
          if (!access.error) {
            const res = await getAddress();
            if (mounted && res.address) {
              setPublicKey(res.address);
            }
          }
        }
      } catch (e) {
        console.error(e);
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
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to connect Freighter');
      }
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
