import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes fresh window (data stays cached in RAM)
      gcTime: 10 * 60 * 1000, // 10 minutes memory retention
      refetchOnWindowFocus: false, // prevent extra network reads on window focus
      retry: 1,
    },
  },
});
