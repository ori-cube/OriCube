import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button, ConfirmDialog } from "@oricube/design-system";
import { createProcedureThumbnail, createViewerTimeline, type ProcedureThumbnail } from "@oricube/engine";
import { ApiRequestError, apiClient, deleteOrigami, fetchOrigami, type Visibility } from "../../apiClient";
import { OrigamiCover } from "../../components/OrigamiCover";
import { listEditKeyIds, loadEditKey, removeEditKey } from "../post-editor/editKeys";
import styles from "./MyOrigamiList.module.css";

interface MyOrigami {
  id: string;
  name: string;
  color: string;
  visibility: Visibility;
  thumbnail: ProcedureThumbnail;
}

/**
 * このブラウザに編集用の鍵がある作品を、新しく投稿した順に読む
 *
 * @description
 * ログインが無いため、サーバーには「自分の作品」の一覧が無い。鍵を残した作品を1件ずつ読み、
 * 一覧・OGP と同じ完成形の図を画面で作る。見つからない作品（他のブラウザで削除したなど）は除く
 */
const fetchMyOrigami = async (): Promise<MyOrigami[]> => {
  const models = await Promise.all(listEditKeyIds().map((id) => fetchOrigami(apiClient, id)));
  return models.flatMap((model) => model ? [{
    id: model.id,
    name: model.name,
    color: model.color,
    visibility: model.visibility,
    thumbnail: createProcedureThumbnail(model.procedure, createViewerTimeline(model.procedure, model.presentation)),
  }] : []);
};

const deleteErrorMessage = (error: unknown) =>
  error instanceof ApiRequestError && (error.status === 401 || error.status === 403)
    ? "このブラウザの編集用の鍵では削除できませんでした。"
    : "削除できませんでした。時間をおいてもう一度お試しください。";

function MyOrigamiCard({ origami, onDelete }: { origami: MyOrigami; onDelete: (origami: MyOrigami) => void }) {
  return <li className={styles.item}>
    <article className={styles.card} aria-labelledby={`my-origami-${origami.id}`}>
      <OrigamiCover thumbnail={origami.thumbnail} color={origami.color} />
      <div className={styles.body}>
        <h2 id={`my-origami-${origami.id}`} className={styles.name}>{origami.name}</h2>
        <p className={styles.meta}>{origami.visibility === "unlisted" ? "限定公開（URLを知っている人だけ）" : "公開"}</p>
        <div className={styles.actions}>
          <Link className={styles.link} to={`/view/${origami.id}`}>見る</Link>
          <Link className={styles.link} to={`/post?edit=${encodeURIComponent(origami.id)}`}>編集する</Link>
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
 * このブラウザで投稿した（編集用の鍵がある）作品を、限定公開も含めて並べ、見る・再編集（作成画面で読み込んで同じURLのまま上書き）・削除ができる。
 * 削除は確認してから、作品を完全に消す（#100 の保存契約）
 */
export function MyOrigamiList() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["my-origami"], queryFn: fetchMyOrigami });
  const [target, setTarget] = useState<MyOrigami | null>(null);
  const [deletedName, setDeletedName] = useState("");
  const remove = useMutation({
    mutationFn: async (origami: MyOrigami) => {
      const editKey = loadEditKey(origami.id);
      if (!editKey) throw new ApiRequestError("編集用の鍵がありません。", 403, "missing_edit_key");
      await deleteOrigami(apiClient, origami.id, editKey);
    },
    onSuccess: async (_, origami) => {
      removeEditKey(origami.id);
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

  const content = query.isPending ? <p className={styles.message} role="status">作品を読み込んでいます…</p>
    : query.isError ? <div className={styles.message}>
      <p role="alert">作品を読み込めませんでした。もう一度読み込んでください。</p>
      <Button text="再試行" onClick={() => void query.refetch()} />
    </div>
      : <>
        <p className={styles.count} role="status">{deletedName ? `「${deletedName}」を削除しました。` : ""}{query.data.length}件の作品</p>
        {query.data.length
          ? <ul className={styles.list} aria-label="自分の作品">{query.data.map((origami) => <MyOrigamiCard key={origami.id} origami={origami} onDelete={openDelete} />)}</ul>
          : <p className={styles.message}>このブラウザで投稿した作品はまだありません。</p>}
      </>;

  return <main id="origami-viewer" className={styles.page}>
    <div className={styles.header}>
      <h1 className={styles.title}>自分の作品</h1>
      <Link to="/post" className={styles.create}>折り紙を作る</Link>
    </div>
    <p className={styles.count}>このブラウザで投稿した作品です。編集・削除に使う鍵はこのブラウザに保存されていて、ブラウザのデータを消すと表示・編集できなくなります。</p>
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
      <p>作品を削除します。作品ページのURLも見られなくなり、元に戻せません。</p>
      <p>折った手順の下書きがこのブラウザにあれば、下書きは残ります。</p>
    </ConfirmDialog>
  </main>;
}
