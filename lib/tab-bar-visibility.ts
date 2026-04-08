import { useState, useEffect } from 'react';

let _hidden = false;
const _listeners = new Set<() => void>();

export function hideTabBar() {
  _hidden = true;
  _listeners.forEach((l) => l());
}

export function showTabBar() {
  _hidden = false;
  _listeners.forEach((l) => l());
}

export function useTabBarVisible() {
  const [visible, setVisible] = useState(!_hidden);
  useEffect(() => {
    const listener = () => setVisible(!_hidden);
    _listeners.add(listener);
    listener();
    return () => { _listeners.delete(listener); };
  }, []);
  return visible;
}
