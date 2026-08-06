import { useEffect, useState } from "react"
import { AccountContextProvider } from "@/modules/context/account-context"
import type { AccountService } from "@/modules/interfaces/account"

type MockAccountProviderProps = React.PropsWithChildren<{
  accountService: AccountService
}>

export function MockAccountProvider({ accountService, children }: MockAccountProviderProps) {
  const [balance, setBalance] = useState(accountService.getBalance())
  useEffect(() => {
    const unsubscribe = accountService.subscribe(setBalance)
    return unsubscribe
  }, [accountService])
  return <AccountContextProvider value={{ balance, accountService }}>
    {children}
  </AccountContextProvider>
}
