import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const TAB_ROOTS = ['/', '/my-moves', '/tracking', '/driver-hub', '/storage', '/help'];

function getActiveTab(pathname) {
  if (TAB_ROOTS.includes(pathname)) return pathname;
  for (const root of TAB_ROOTS) {
    if (root !== '/' && pathname.startsWith(root)) return root;
  }
  return null;
}

const TabHistoryContext = createContext({ tabHistory: {}, getTargetPath: () => '/', resetTabStack: () => {} });

export function TabHistoryProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabStacks, setTabStacks] = useState({});
  const lastTabRef = useRef(null);

  const activeTab = getActiveTab(location.pathname);

  // Track navigation and maintain per-tab stacks
  useEffect(() => {
    const currentTab = getActiveTab(location.pathname);
    if (!currentTab) return;

    setTabStacks(prev => {
      const stack = prev[currentTab] ? [...prev[currentTab]] : [];
      // If this is a tab root or re-selecting the tab root, reset stack to just root
      if (location.pathname === currentTab) {
        // Reset to root only
        return { ...prev, [currentTab]: [currentTab] };
      }
      // Push path if not already the last entry
      if (stack[stack.length - 1] !== location.pathname) {
        stack.push(location.pathname);
      }
      // Keep stack reasonable
      if (stack.length > 20) stack.shift();
      return { ...prev, [currentTab]: stack };
    });

    lastTabRef.current = currentTab;
  }, [location.pathname]);

  const getTargetPath = useCallback((tabPath) => {
    return tabStacks[tabPath]?.[tabStacks[tabPath].length - 1] || tabPath;
  }, [tabStacks]);

  const resetTabStack = useCallback((tabPath) => {
    setTabStacks(prev => ({ ...prev, [tabPath]: [tabPath] }));
  }, []);

  // Handle back navigation within a tab
  const goBackInTab = useCallback(() => {
    const currentTab = getActiveTab(location.pathname);
    if (!currentTab) {
      navigate(-1);
      return;
    }
    const stack = tabStacks[currentTab] || [];
    if (stack.length > 1) {
      // Pop current
      const newStack = stack.slice(0, -1);
      setTabStacks(prev => ({ ...prev, [currentTab]: newStack }));
      const target = newStack[newStack.length - 1];
      navigate(target);
    } else {
      // No more in stack — fall back to browser history
      navigate(-1);
    }
  }, [tabStacks, location.pathname, navigate]);

  return (
    <TabHistoryContext.Provider value={{ tabHistory: tabStacks, getTargetPath, resetTabStack, goBackInTab }}>
      {children}
    </TabHistoryContext.Provider>
  );
}

export function useTabHistory() {
  return useContext(TabHistoryContext);
}