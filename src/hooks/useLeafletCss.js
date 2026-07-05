import { useEffect } from 'react';

let injected = false;

export function useLeafletCss() {
  useEffect(() => {
    if (injected) return;
    injected = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }, []);
}