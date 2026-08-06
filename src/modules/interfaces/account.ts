export interface AccountBalance {
  amountCents: number;
  currency: string;
}

export interface AccountService {
  getBalance: () => AccountBalance;
  topUp: (amountCents: number) => Promise<AccountBalance>;
  subscribe: (callback: (balance: AccountBalance) => void) => () => void;
}
