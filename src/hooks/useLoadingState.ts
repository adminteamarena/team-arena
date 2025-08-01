import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

export const useLoadingState = (initialLoading = false): LoadingState => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null); // Clear error when starting new operation
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    try {
      const result = await asyncFn();
      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, [setLoading]);

  return {
    isLoading,
    error,
    setLoading,
    setError,
    reset,
    execute
  };
};

// Multiple loading states hook for complex components
export const useMultipleLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
    if (loading) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
    setLoadingStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const isLoading = useCallback((key: string) => loadingStates[key] || false, [loadingStates]);
  const getError = useCallback((key: string) => errors[key] || null, [errors]);

  const execute = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(key, true);
    try {
      const result = await asyncFn();
      setLoading(key, false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(key, errorMessage);
      return null;
    }
  }, [setLoading, setError]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      setErrors(prev => ({ ...prev, [key]: null }));
    } else {
      setLoadingStates({});
      setErrors({});
    }
  }, []);

  return {
    isLoading,
    getError,
    setLoading,
    setError,
    execute,
    reset
  };
};