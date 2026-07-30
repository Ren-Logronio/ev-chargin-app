export interface AuthContext {
  user: AuthUser | null;
  authService: AuthService
}

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

export interface AuthService {
  getCurrentUser: () => AuthUser | null;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<AuthUser | null>,
  loginWithGoogle: () => Promise<AuthUser | null>;
  loginWithApple: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  subscribe: (callback: (user: AuthUser | null) => void) => () => void;
}
