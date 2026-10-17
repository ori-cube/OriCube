import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Button } from "@oricube/design-system";
import type { OrigamiModelV2 } from "@oricube/engine";
import { apiClient } from "../../apiClient";
import { useAuthState } from "../../auth/AuthContext";

type PublishFailure = "unauthorized" | "invalid" | "failed";

class PublishError extends Error {
  constructor(readonly reason: PublishFailure) {
    super(reason);
  }
}

const failureMessages: Record<PublishFailure, string> = {
  unauthorized: "ログインの有効期限が切れました。もう一度ログインしてから投稿してください。",
  invalid: "この手順は投稿できません。最後の操作を戻してから、もう一度お試しください。",
  failed: "投稿できませんでした。時間をおいてもう一度お試しください。",
};

interface Props {
  /** 投稿する作品。書き出せない手順や操作中は null */
  model: OrigamiModelV2 | null;
  disabled?: boolean;
  /** ログイン後に戻る画面 */
  returnTo?: string;
}

/**
 * 作品を投稿するボタン
 *
 * @description
 * 未ログインならログイン画面へ移動する。下書きはブラウザに保存済みなので、ログイン後に戻ってから改めて押して投稿する（戻っただけで公開しない）
 */
export function PublishButton({ model, disabled = false, returnTo = "/post" }: Props) {
  const auth = useAuthState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const publish = useMutation({
    mutationFn: async ({ id: _id, ...input }: OrigamiModelV2) => {
      const res = await apiClient.api.models.$post({ json: input });
      // 401・403 はミドルウェア（ログイン検証・CSRF）が返すため RPC の型には現れない
      const status: number = res.status;
      if (status === 401) throw new PublishError("unauthorized");
      if (status === 400) throw new PublishError("invalid");
      if (res.status !== 201) throw new PublishError("failed");
      return res.json();
    },
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: ["origami", id] });
      navigate(`/view/${id}`);
    },
  });

  if (auth.status === "unavailable") return <p>ログインの設定がないため、この環境では投稿できません。</p>;
  if (auth.status !== "signedIn") {
    return <div>
      <Button text="ログインして投稿" onClick={() => auth.signIn(returnTo)} disabled={disabled || auth.status === "loading"} />
      <p>下書きはこのブラウザに保存されています。ログイン後にこの画面へ戻り、もう一度「投稿する」を押してください。</p>
    </div>;
  }
  const failure = publish.error instanceof PublishError ? publish.error.reason : publish.error ? "failed" : null;
  return <div>
    <Button text={publish.isPending ? "投稿しています…" : "投稿する"} onClick={() => model && publish.mutate(model)} disabled={disabled || !model || publish.isPending} />
    {failure && <p role="alert">{failureMessages[failure]}</p>}
  </div>;
}
