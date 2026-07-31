import { useEffect, useState } from "react"
import { AuthContextProvider } from "@/modules/context/auth-context"
import type { AuthService } from "@/modules/interfaces/auth"

type FirebaseAuthProviderProps = React.PropsWithChildren<{
  authService: AuthService
}>

export function FirebaseAuthProvider({ authService, children }: FirebaseAuthProviderProps) {
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  useEffect(() => {
    const unsubscribe = authService.subscribe(setCurrentUser);
    return unsubscribe;
  }, [authService]);
  return <AuthContextProvider value={{ user: currentUser, authService }}>
    {children}
  </AuthContextProvider>
}
