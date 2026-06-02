import { useState, useEffect } from 'react';
import { useMediaQuery } from './useMediaQuery.js';

export function useSidebar() {
  const isTabletOrSmaller = useMediaQuery('(max-width: 1023px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isTabletOrSmaller);

  useEffect(() => {
    setSidebarOpen(!isTabletOrSmaller);
  }, [isTabletOrSmaller]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return { sidebarOpen, setSidebarOpen, toggleSidebar };
}
