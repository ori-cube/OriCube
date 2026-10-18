import { useLocation } from "react-router";
import { Button } from "@oricube/design-system";
import { useAuthState } from "../auth/AuthContext";

/** ヘッダーのログイン・ログアウト。ログイン後は今いる画面へ戻る */
export function AuthMenu() {
  const auth = useAuthState();
  const location = useLocation();
  if (auth.status === "signedIn") return <Button text="ログアウト" variant="secondary" onClick={auth.signOut} />;
  if (auth.status === "signedOut") return <Button text="ログイン" variant="secondary" onClick={() => auth.signIn(`${location.pathname}${location.search}`)} />;
  return null;
}
