import { createContext } from "react";
import type { AccountBalance, AccountService } from "@/modules/interfaces/account";

export interface AccountContext {
  balance: AccountBalance;
  accountService: AccountService;
}

export const accountContext = createContext<AccountContext | null>(null);

export const AccountContextProvider = accountContext.Provider;
