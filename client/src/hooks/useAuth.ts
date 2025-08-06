import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include"
        });
        if (!response.ok) {
          return null; // Return null instead of throwing for 401s
        }
        return response.json();
      } catch (error) {
        // Silent fail for auth checks in production
        if (process.env.NODE_ENV === 'development') {
          console.warn("Auth check failed:", error);
        }
        return null; // Handle network errors gracefully
      }
    },
    retry: false,
    staleTime: 0, // Always check for fresh auth state
    throwOnError: false, // Prevent unhandled promise rejections
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
