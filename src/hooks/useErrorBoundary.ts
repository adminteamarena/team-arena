import { useCallback, useState } from 'react';

interface ErrorBoundaryState {
  error: Error | null;
  resetError: () => void;
  captureError: (error: Error) => void;
}

export const useErrorBoundary = (): ErrorBoundaryState => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  // Re-throw error in next tick to trigger error boundary
  if (error) {
    throw error;
  }

  return {
    error,
    resetError,
    captureError
  };
};

// Hook to wrap async operations with error handling
export const useAsyncError = () => {
  const { captureError } = useErrorBoundary();

  const executeAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (onError) {
        onError(errorObj);
        return null;
      } else {
        captureError(errorObj);
        return null;
      }
    }
  }, [captureError]);

  return { executeAsync };
};