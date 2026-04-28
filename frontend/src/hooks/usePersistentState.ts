import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const readValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [state, setState] = useState<T>(readValue);

  useEffect(() => {
    // Standard storage event (fires across different tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    // Custom local event (fires within the same tab)
    const handleLocalChange = () => {
      setState(readValue());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleLocalChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleLocalChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(state) : value;
      setState(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      // Manually dispatch a storage event so same-tab components can react if needed, 
      // though typically React handles same-component state.
      window.dispatchEvent(new Event('local-storage'));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [state, setValue] as const;
}
