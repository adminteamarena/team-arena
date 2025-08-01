import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  isHeaderVisible: boolean;
  hideHeader: () => void;
  showHeader: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const hideHeader = () => setIsHeaderVisible(false);
  const showHeader = () => setIsHeaderVisible(true);

  const value = {
    isHeaderVisible,
    hideHeader,
    showHeader,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};