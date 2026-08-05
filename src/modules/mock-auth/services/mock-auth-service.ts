import type { AuthService, AuthUser } from "@/modules/interfaces/auth"

const MOCK_EMAIL = "test@gmail.com"
const MOCK_PASSWORD = "testpassword"

const MOCK_USER: AuthUser = {
  userId: "mock-user-id",
  email: MOCK_EMAIL,
  displayName: "Test User",
  avatarUrl: "",
}

export class MockAuthService implements AuthService {
  #currentUser: AuthUser | null = null
  #listeners = new Set<(user: AuthUser | null) => void>()

  getCurrentUser(): AuthUser | null {
    return this.#currentUser
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<AuthUser | null> {
    if (email !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
      throw Object.assign(new Error("Invalid email or password."), { code: "auth/invalid-credential" })
    }
    this.#setCurrentUser(MOCK_USER)
    return this.#currentUser
  }

  async loginWithGoogle(): Promise<AuthUser | null> {
    throw new Error("Not implemented")
  }

  async loginWithApple(): Promise<AuthUser | null> {
    throw new Error("Not implemented")
  }

  async logout(): Promise<void> {
    this.#setCurrentUser(null)
  }

  subscribe(callback: (user: AuthUser | null) => void): () => void {
    this.#listeners.add(callback)
    return () => this.#listeners.delete(callback)
  }

  #setCurrentUser(user: AuthUser | null) {
    this.#currentUser = user
    for (const listener of this.#listeners) listener(user)
  }
}
