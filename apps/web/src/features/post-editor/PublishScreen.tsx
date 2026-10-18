import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button, SegmentedControl, TextArea, TextInput } from "@oricube/design-system";
import { createViewerTimeline, type FixBoardV2, type OrigamiModelV2, type PresentationV2 } from "@oricube/engine";
import { apiClient, type Visibility } from "../../apiClient";
import { useAuthState } from "../../auth/AuthContext";
import { OrigamiCanvas, type OrigamiCanvasHandle } from "../../components/OrigamiViewer/Canvas";
import { THUMBNAIL_SIZE, submitErrorMessage, submitOrigami, type PendingSubmission } from "./publish";
import styles from "./PostEditor.module.css";

export interface PublishScreenProps {
  /** 投稿する作品（下書きと同じ内容） */
  model: OrigamiModelV2;
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  /** 撮影した向きを、完成形を見せる向きとして下書きに残す。回していなければ undefined */
  onPresentationChange: (presentation: PresentationV2 | undefined) => void;
  onBack: () => void;
  /** 投稿後に白紙から折り直す */
  onStartNew: () => void;
}

/**
 * 完成形が枠いっぱい（約75%）に写る倍率
 *
 * @description
 * 閲覧シーンは紙の大きさ（size）の約1.39倍が枠に収まる距離から見る（視野角35度・距離 size×2.2）。
 * 向きを変えてもはみ出さないよう、完成形の外接球の直径で合わせる
 */
export const fitZoom = (size: number, boards: FixBoardV2[]) => {
  const points = boards.flatMap((board) => board.polygon);
  if (!points.length) return 1;
  const center = [0, 1, 2].map((axis) => (Math.min(...points.map((point) => point[axis])) + Math.max(...points.map((point) => point[axis]))) / 2);
  const radius = Math.max(...points.map((point) => Math.hypot(point[0] - center[0], point[1] - center[1], point[2] - center[2])));
  const visible = 2 * 2.2 * size * Math.tan(Math.PI * 35 / 360);
  return Math.min(4, Math.max(1, visible * 0.75 / (2 * radius || 1)));
};

/** 回していない向き（q と -q は同じ回転） */
const isIdentity = (rotation: PresentationV2["rotation"]) => Math.abs(rotation[3]) > 1 - 1e-9;

const visibilityItems: { id: Visibility; label: string }[] = [
  { id: "public", label: "公開" },
  { id: "unlisted", label: "限定公開" },
];

const visibilityHints: Record<Visibility, string> = {
  public: "作品一覧と検索に載り、誰でも見られます。",
  unlisted: "作品一覧と検索には載らず、URLを知っている人だけが見られます。",
};

/** 画面内で回す1回の角度 */
const ROTATE_STEP = Math.PI / 12;

// 撮影の背景は作業台と同じ色にする。OGP など透過を扱えない表示先があるため塗りつぶす
const thumbnailBackground = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--background-subtle").trim() || "#f5f5f5";

/**
 * 投稿画面
 *
 * @description
 * 一覧・OGP に使うサムネイルを、完成形を好きな向きに回して撮影してから投稿する。
 * 枠の中に写る範囲がそのまま正方形のサムネイルになる
 */
export function PublishScreen({ model, name, onNameChange, description, onDescriptionChange, onPresentationChange, onBack, onStartNew }: PublishScreenProps) {
  // 開いたときの見せる向きから始める。撮影で更新した向きを表示に重ねないよう、開いたときの値に固定する
  const [initialPresentation] = useState(model.presentation);
  const timeline = useMemo(() => createViewerTimeline(model.procedure, initialPresentation), [model.procedure, initialPresentation]);
  const zoom = useMemo(() => fitZoom(model.procedure.size, timeline.finalBoards), [model.procedure.size, timeline.finalBoards]);
  const canvas = useRef<OrigamiCanvasHandle>(null);
  const pending = useRef<PendingSubmission | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [thumbnail, setThumbnail] = useState<Blob | null>(null);
  const [captureError, setCaptureError] = useState("");
  const [nameError, setNameError] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const thumbnailUrl = useMemo(() => thumbnail ? URL.createObjectURL(thumbnail) : null, [thumbnail]);
  useEffect(() => () => { if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl); }, [thumbnailUrl]);

  const auth = useAuthState();
  const queryClient = useQueryClient();
  const submit = useMutation({
    mutationFn: (image: Blob) => submitOrigami({
      client: apiClient,
      input: { name: name.trim(), description: description.trim(), color: model.color, procedure: model.procedure, visibility, ...(model.presentation ? { presentation: model.presentation } : {}) },
      thumbnail: image,
      previous: pending.current,
      onPending: (next) => { pending.current = next; },
    }),
    onSuccess: async (id) => {
      pending.current = null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["origami", id] }),
        queryClient.invalidateQueries({ queryKey: ["origami-list"] }),
      ]);
    },
  });

  const capture = async () => {
    setCaptureError("");
    try {
      if (!canvas.current) throw new Error("3D表示がありません");
      const rotation = canvas.current.getModelRotation();
      setThumbnail(await canvas.current.capture({ size: THUMBNAIL_SIZE, background: thumbnailBackground() }));
      // サムネイルと同じ向きを、閲覧ページで完成形を見せる向きにする
      onPresentationChange(rotation && !isIdentity(rotation) ? { rotation } : undefined);
    }
    catch { setCaptureError("撮影できませんでした。「向きをリセット」を押してから、もう一度撮影してください。"); }
  };
  const publish = () => {
    if (!name.trim()) { setNameError("作品名を入力してください。"); return; }
    if (!thumbnail) { setCaptureError("先にサムネイルを撮影してください。"); return; }
    submit.mutate(thumbnail);
  };

  if (submit.isSuccess) return <main id="origami-viewer" className={styles.published}>
    <h1 className={styles.publishedTitle}>投稿しました</h1>
    <p className={styles.hint}>「{name.trim()}」を公開しました。折った手順はこのブラウザにも残っています。</p>
    {thumbnailUrl && <img className={styles.publishedImage} src={thumbnailUrl} alt={`${name.trim()}のサムネイル`} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} />}
    <div className={styles.previewActions}>
      <Link className={styles.link} to={`/view/${submit.data}`}>作品ページを見る</Link>
      <Button text="白紙から新しく折る" variant="secondary" onClick={onStartNew} />
    </div>
  </main>;

  return <div className={styles.preview}>
    <div className={styles.previewBar}>
      <div className={styles.previewNote}>
        <p className={styles.hint}>完成形を回して、枠の中がサムネイルになる向きで撮影します。サムネイルは作品一覧とSNSでの共有に使います。</p>
      </div>
      <div className={styles.previewActions}>
        <Button text="折る画面に戻る" variant="secondary" onClick={onBack} disabled={submit.isPending} />
      </div>
    </div>
    <main id="origami-viewer" className={styles.publish}>
      <div className={styles.camera}>
        <OrigamiCanvas
          ref={canvas} size={model.procedure.size} color={model.color} progress={1}
          finalBoards={timeline.finalBoards} flatFinalBoards={model.procedure.finalBoards} finalViewFront={timeline.finalViewFront} finalRotation={timeline.finalRotation}
          resetKey={resetKey} zoom={zoom}
          label={`${name.trim() || model.name}の完成形。ドラッグまたは矢印キーで回して、サムネイルの向きを決めます。`}
        />
        <div className={styles.cameraFrame} aria-hidden />
        <div className={styles.rotate} role="group" aria-label="作品を画面内で回す">
          <Button text="左に回す" variant="secondary" size="sm" onClick={() => canvas.current?.rotateModel(ROTATE_STEP)} disabled={submit.isPending} />
          <Button text="右に回す" variant="secondary" size="sm" onClick={() => canvas.current?.rotateModel(-ROTATE_STEP)} disabled={submit.isPending} />
        </div>
      </div>
      <form className={styles.publishForm} aria-label="投稿の内容" onSubmit={(event) => { event.preventDefault(); publish(); }}>
        <h1 className={styles.publishTitle}>投稿する</h1>
        <TextInput label="作品名" required value={name} onChange={(value) => { onNameChange(value); setNameError(""); }} placeholder="例：鶴" errorMessage={nameError || undefined} />
        <TextArea label="説明" value={description} onChange={onDescriptionChange} placeholder="例：羽を広げた鶴です。" rows={3} />
        <div className={styles.visibility}>
          <SegmentedControl label="公開範囲" items={visibilityItems} value={visibility} onChange={setVisibility} />
          <p className={styles.hint}>{visibilityHints[visibility]}</p>
        </div>
        <section className={styles.section} aria-labelledby="publish-thumbnail">
          <h2 id="publish-thumbnail" className={styles.sectionTitle}>サムネイル</h2>
          {thumbnailUrl
            ? <img className={styles.thumbnail} src={thumbnailUrl} alt="撮影したサムネイル" width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} />
            : <p className={styles.hint}>まだ撮影していません。作品が傾いて見えるときは、まず正面のまま「左に回す」「右に回す」（15°ずつ）で立ててから、ドラッグや矢印キーで角度をつけます。ホイールやピンチで大きさを変えられます。撮影した向きは、作品ページで完成形を見せる向きにもなります。</p>}
          <div className={styles.previewActions}>
            <Button text={thumbnail ? "撮り直す" : "この向きで撮影"} variant="secondary" onClick={() => void capture()} disabled={submit.isPending} />
            <Button text="向きをリセット" variant="secondary" onClick={() => setResetKey((value) => value + 1)} disabled={submit.isPending} />
          </div>
          {captureError && <p className={styles.alert} role="alert">{captureError}</p>}
        </section>
        {auth.status === "signedOut" || auth.status === "loading"
          // 下書きはブラウザに保存済み。ログイン後は作成画面へ戻り、もう一度投稿へ進む（戻っただけで公開しない）
          ? <>
            <Button text="ログインして投稿" onClick={() => auth.signIn("/post")} disabled={auth.status === "loading"} />
            <p className={styles.hint}>下書きはこのブラウザに保存されています。ログイン後に作成画面へ戻ったら、もう一度「投稿へ進む」から投稿してください。</p>
          </>
          // ログインの設定がない環境（ローカル）でも、開発用の API（pnpm dev:api）なら開発ユーザーとして投稿できる
          : <Button type="submit" text={submit.isPending ? "投稿しています…" : "投稿する"} disabled={submit.isPending} />}
        {submit.isError && <p className={styles.alert} role="alert">{submitErrorMessage(submit.error, auth.status)}</p>}
      </form>
    </main>
  </div>;
}
