import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export const TAB_ROOTS = ['/', '/my-moves', '/driver-hub', '/storage', '/help'];

function getActiveTab(pathname) {
  if (TAB_ROOTS.includes(pathname)) return pathname;
  for (const root of TAB_ROOTS) {
    if (root !== '/' && pathname.startsWith(root)) return root;
  }
  return null;
}

const TabHistoryContext = createContext({ tabHistory: {}, getTargetPath: () => '/' });

export function TabHistoryProvider({ children }) {
  const location = useLocation();
  const [tabHistory, setTabHistory] = useState({});

  useEffect(() => {
    const activeTab = getActiveTab(location.pathname);
    if (activeTab) {
      setTabHistory(prev => ({ ...prev, [activeTab]: location.pathname }));
    }
  }, [location.pathname]);

  const getTargetPath = useCallback((tabPath) => {
    return tabHistory[tabPath] || tabPath;
  }, [tabHistory]);

  return (
    <TabHistoryContext.Provider value={{ tabHistory, getTargetPath }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  return useContext(TabHistoryContext);
}