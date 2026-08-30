'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsCollapsed: (value: boolean) => void;
  setIsMobileOpen: (value: boolean) => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Load initial collapsed state from localStorage after mounting
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('slims_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsedState(stored === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setIsCollapsed = (value: boolean) => {
    setIsCollapsedState(value);
    try {
      localStorage.setItem('slims_sidebar_collapsed', String(value));
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed: isMounted ? isCollapsed : false,
        isMobileOpen,
        toggleSidebar,
        toggleMobileSidebar,
        setIsCollapsed,
        setIsMobileOpen,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
