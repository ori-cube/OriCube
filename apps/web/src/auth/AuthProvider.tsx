import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { AuthContext, type AuthState } from "./AuthContext";

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const value = useMemo<AuthState>(() => ({
    status: !isLoaded ? "loading" : isSignedIn ? "signedIn" : "signedOut",
    // ログイン画面は Clerk が提供するページへ移動する（画面にClerkの部品を埋め込まない）
    signIn: (returnTo) => void clerk.redirectToSignIn({ signInForceRedirectUrl: returnTo, signUpForceRedirectUrl: returnTo }),
    signOut: () => void clerk.signOut(),
  }), [clerk, isLoaded, isSignedIn]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Clerk のキーがあればログインを有効にする。無ければ閲覧と下書きだけ使える */
export function AuthProvider({ children, publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY }: { children: ReactNode; publishableKey?: string }) {
  if (!publishableKey) return <>{children}</>;
  return <ClerkProvider publishableKey={publishableKey}>
    <ClerkBridge>{children}</ClerkBridge>
  </ClerkProvider>;
}
