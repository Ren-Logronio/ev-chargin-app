import { onAuthStateChanged, signInWithEmailAndPassword } from "@react-native-firebase/auth"
import type { Auth, User } from "@react-native-firebase/auth"
import type { AuthService, AuthUser } from "@/modules/interfaces/auth"

export class FirebaseAuthService implements AuthService {
  #authModule: Auth
  constructor(authModule: Auth) {
    this.#authModule = authModule
  }

  getCurrentUser(): AuthUser | null {
    const user = this.#authModule.currentUser
    return user ? this.#toAuthUser(user) : null
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<AuthUser | null> {
    const credential = await signInWithEmailAndPassword(this.#authModule, email, password)
    return this.#toAuthUser(credential.user)
  }

  async loginWithGoogle(): Promise<AuthUser | null> {
    throw new Error("Not implemented")
  }

  async loginWithApple(): Promise<AuthUser | null> {
    throw new Error("Not implemented")
  }

  subscribe(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.#authModule, (user) => {
      callback(user ? this.#toAuthUser(user) : null)
    })
  }

  #toAuthUser(user: User): AuthUser {
    return {
      userId: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      avatarUrl: user.photoURL ?? "",
    }
  }
}
