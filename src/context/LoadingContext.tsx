import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  isLoading: boolean;
  text?: string;
  progress?: number;
}

interface LoadingContextType {
  globalLoading: LoadingState;
  setGlobalLoading: (loading: Partial<LoadingState>) => void;
  showPageLoader: (text?: string) => void;
  hidePageLoader: () => void;
  updateProgress: (progress: number) => void;
  withLoading: <T>(asyncFn: () => Promise<T>, text?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [globalLoading, setGlobalLoadingState] = useState<LoadingState>({
    isLoading: false,
    text: 'Loading...',
    progress: undefined
  });

  const setGlobalLoading = useCallback((loading: Partial<LoadingState>) => {
    setGlobalLoadingState(prev => ({ ...prev, ...loading }));
  }, []);

  const showPageLoader = useCallback((text?: string) => {
    setGlobalLoading({
      isLoading: true,
      text: text || 'Loading...',
      progress: undefined
    });
  }, [setGlobalLoading]);

  const hidePageLoader = useCallback(() => {
    setGlobalLoading({ isLoading: false });
  }, [setGlobalLoading]);

  const updateProgress = useCallback((progress: number) => {
    setGlobalLoading({ progress: Math.min(Math.max(progress, 0), 100) });
  }, [setGlobalLoading]);

  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>, 
    text?: string
  ): Promise<T> => {
    showPageLoader(text);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      hidePageLoader();
    }
  }, [showPageLoader, hidePageLoader]);

  const value: LoadingContextType = {
    globalLoading,
    setGlobalLoading,
    showPageLoader,
    hidePageLoader,
    updateProgress,
    withLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;