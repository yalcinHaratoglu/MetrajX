import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  type LoginPayload,
  type RegisterPayload,
  type UserProfile,
} from "../services/authService";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setUser(null);
      return;
    }
    const profile = await authService.getProfile();
    setUser(profile);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (authService.isAuthenticated()) {
          await refreshProfile();
        }
      } catch {
        await authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [refreshProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    await authService.login(payload);
    await refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (payload: RegisterPayload) => {
    await authService.register(payload);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
