import type { AccountBalance, AccountService } from "@/modules/interfaces/account"

const INITIAL_BALANCE: AccountBalance = {
  amountCents: 2500,
  currency: "USD",
}

export class MockAccountService implements AccountService {
  #balance: AccountBalance = INITIAL_BALANCE
  #listeners = new Set<(balance: AccountBalance) => void>()

  getBalance(): AccountBalance {
    return this.#balance
  }

  async topUp(amountCents: number): Promise<AccountBalance> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error("Top-up amount must be greater than zero.")
    }
    this.#setBalance({ ...this.#balance, amountCents: this.#balance.amountCents + amountCents })
    return this.#balance
  }

  subscribe(callback: (balance: AccountBalance) => void): () => void {
    this.#listeners.add(callback)
    return () => this.#listeners.delete(callback)
  }

  #setBalance(balance: AccountBalance) {
    this.#balance = balance
    for (const listener of this.#listeners) listener(balance)
  }
}
