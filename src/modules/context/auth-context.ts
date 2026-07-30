import { createContext } from "react";
import type { AuthContext } from "@/modules/interfaces/auth";

export const authContext = createContext<AuthContext | null>(null);

export const AuthContextProvider = authContext.Provider;
