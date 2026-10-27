import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button, ConfirmDialog } from "@oricube/design-system";
import { ApiRequestError, apiClient, deleteOrigami, fetchMyOrigami, type MyOrigami } from "../../apiClient";
import { useAuthState } from "../../auth/AuthContext";
import { OrigamiCover } from "../../components/OrigamiCover";
import styles from "./MyOrigamiList.module.css";

const deleteErrorMessage = (error: unknown) => {
  if (error instanceof ApiRequestError && error.status === 401) return "ログインの有効期限が切れました。もう一度ログインしてから削除してください。";
  if (error instanceof ApiRequestError && error.status === 429) return "短い時間に操作が多すぎました。1分ほど待ってから、もう一度お試しください。";
  return "削除できませんでした。時間をおいてもう一度お試しください。";
};

function MyOrigamiCard({ origami, onDelete }: { origami: MyOrigami; onDelete: (origami: MyOrigami) => void }) {
  const published = origami.status === "published";
  return <li className={styles.item}>
    <article className={styles.card} aria-labelledby={`my-origami-${origami.id}`}>
      <OrigamiCover thumbnailUrl={origami.thumbnailUrl} thumbnail={origami.thumbnail} color={origami.color} />
      <div className={styles.body}>
        <h2 id={`my-origami-${origami.id}`} className={styles.name}>{origami.name}</h2>
        <p className={styles.meta}>
          {!published ? "投稿が完了していません" : origami.visibility === "unlisted" ? "限定公開（URLを知っている人だけ）" : "公開"}
        </p>
        <div className={styles.actions}>
          {/* 公開前の作品はサムネイルが確定していないため、見ること・再編集はできず削除だけできる */}
          {published && <Link className={styles.link} to={`/view/${origami.id}`}>見る</Link>}
          {published && <Link className={styles.link} to={`/post?edit=${encodeURIComponent(origami.id)}`}>編集する</Link>}
          <Button text="削除する" variant="secondary" size="sm" onClick={() => onDelete(origami)} />
        </div>
      </div>
    </article>
  </li>;
}

/**
 * 自分の作品の一覧
 *
 * @description
 * 限定公開・公開前の作品も含めて並べ、見る・再編集（作成画面で読み込んで同じURLのまま上書き）・削除ができる。
 * 削除は確認してから、作品とサムネイルを完全に消す（#100 の保存契約）
 */
export function MyOrigamiList() {
  const auth = useAuthState();
  const queryClient = useQueryClient();
  // ログインの設定がない環境（ローカル）でも、開発用の API（pnpm dev:api）なら開発ユーザーの作品を返すので API に任せる
  const query = useQuery({ queryKey: ["my-origami"], queryFn: () => fetchMyOrigami(apiClient), enabled: auth.status === "signedIn" || auth.status === "unavailable",
    // ログイン切れなど 4xx は再試行しても変わらない
    retry: (count, error) => !(error instanceof ApiRequestError && error.status < 500) && count < 3,
  });
  const unauthorized = query.error instanceof ApiRequestError && query.error.status === 401;
  const [target, setTarget] = useState<MyOrigami | null>(null);
  const [deletedName, setDeletedName] = useState("");
  const remove = useMutation({
    mutationFn: (origami: MyOrigami) => deleteOrigami(apiClient, origami.id),
    onSuccess: async (_, origami) => {
      setTarget(null);
      setDeletedName(origami.name);
      queryClient.removeQueries({ queryKey: ["origami", origami.id] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-origami"] }),
        queryClient.invalidateQueries({ queryKey: ["origami-list"] }),
      ]);
    },
  });
  const openDelete = (origami: MyOrigami) => { remove.reset(); setTarget(origami); };

  const content = auth.status === "unavailable" && unauthorized ? <p className={styles.message}>ログインの設定がないため、この環境では自分の作品を表示できません。</p>
    : auth.status === "loading" ? <p className={styles.message} role="status">ログインの状態を確認しています…</p>
      : auth.status === "signedOut" || unauthorized ? <div className={styles.message}>
        <p>自分の作品を見るにはログインしてください。</p>
        <Button text="ログイン" onClick={() => auth.signIn("/me")} />
      </div>
        : query.isPending ? <p className={styles.message} role="status">作品を読み込んでいます…</p>
          : query.isError ? <div className={styles.message}>
            <p role="alert">作品を読み込めませんでした。もう一度読み込んでください。</p>
            <Button text="再試行" onClick={() => void query.refetch()} />
          </div>
            : <>
              <p className={styles.count} role="status">{deletedName ? `「${deletedName}」を削除しました。` : ""}{query.data.length}件の作品</p>
              {query.data.length
                ? <ul className={styles.list} aria-label="自分の作品">{query.data.map((origami) => <MyOrigamiCard key={origami.id} origami={origami} onDelete={openDelete} />)}</ul>
                : <p className={styles.message}>まだ投稿した作品がありません。</p>}
            </>;

  return <main id="origami-viewer" className={styles.page}>
    <div className={styles.header}>
      <h1 className={styles.title}>自分の作品</h1>
      <Link to="/post" className={styles.create}>折り紙を作る</Link>
    </div>
    {content}
    <ConfirmDialog
      isOpen={target !== null}
      onOpenChange={(open) => { if (!open) setTarget(null); }}
      title={`「${target?.name ?? ""}」を削除しますか？`}
      confirmText={remove.isPending ? "削除しています…" : "削除する"}
      onConfirm={() => target && remove.mutate(target)}
      isPending={remove.isPending}
      destructive
      errorMessage={remove.isError ? deleteErrorMessage(remove.error) : undefined}
    >
      <p>作品とサムネイルを削除します。作品ページのURLも見られなくなり、元に戻せません。</p>
      <p>折った手順の下書きがこのブラウザにあれば、下書きは残ります。</p>
    </ConfirmDialog>
  </main>;
}
