"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button, ColorField, SidePanel, TextInput } from "@oricube/design-system";
import type { OrigamiEditorState, OrigamiPostV2Props } from "../../components/OrigamiPost";
import { OrigamiViewer } from "../../components/OrigamiViewer";
import { exportProcedureV2 } from "@oricube/engine";
import { DRAFT_KEY, parseDraft, restoreHistory, serializeDraft, type Draft } from "./draft";
import styles from "./PostEditor.module.css";
import { PublishButton } from "../publish/PublishButton";

const UNTITLED = "無題の作品";

const emptyState = (): OrigamiEditorState => ({ steps: [], color: "#ed7070", viewFront: true, busy: false, phase: "idle" });

// 折り操作のフェーズごとに、次にすることを見出しで案内する
const guidance = (state: OrigamiEditorState) => {
  if (state.phase === "selecting") return "折り方を選んで「折る」を押します";
  if (state.phase === "folding") return "折っています…";
  if (state.phase === "viewing") return "ドラッグで回して確認できます";
  return state.steps.length ? "次に折る頂点をドラッグします" : "頂点をドラッグして、重ねたい位置で離すと折れます";
};

// 紙が上下の見出し・操作帯に隠れない大きさに収まるカメラの距離（視野角40度）
const cameraDistance = (size: number, width: number, height: number) => {
  const paper = Math.min(560, Math.max(160, Math.min(height - 420, width - 48)));
  return size * height / (2 * Math.tan(Math.PI / 9) * paper);
};

export function PostEditor() {
  // WebGLを使う編集画面はブラウザでだけ読み込む（サーバー描画・フレームワークに依存しない）
  const [Editor, setEditor] = useState<ComponentType<OrigamiPostV2Props> | null>(null);
  const [state, setState] = useState(emptyState);
  const [size, setSize] = useState(100);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [preview, setPreview] = useState<"fold" | "completed" | null>(null);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const procedure = useMemo(() => exportProcedureV2({ size, steps: state.steps }), [size, state.steps]);
  const draft: Draft | null = useMemo(() => procedure ? { model: { id: "draft", name: name.trim() || UNTITLED, description: "", color: state.color, procedure }, viewFront: state.viewFront } : null, [procedure, name, state.color, state.viewFront]);
  const blocked = !ready || state.busy || !draft;

  const loadDraft = useCallback((next: Draft) => {
    setState({ steps: restoreHistory(next.model.procedure.history), color: next.model.color, viewFront: next.viewFront, busy: false, phase: "idle" });
    setSize(next.model.procedure.size); setName(next.model.name === UNTITLED ? "" : next.model.name); setPreview(null);
    setGeneration((value) => value + 1); setStorageError(""); setPersistenceReady(true);
  }, []);
  useEffect(() => {
    let active = true;
    void import("../../components/OrigamiPost").then((module) => { if (active) setEditor(() => module.OrigamiPostV2); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) { loadDraft(parseDraft(saved)); setMessage("前回の続きから再開しました。"); }
      else setPersistenceReady(true);
    } catch { setStorageError("前回の下書きを読み込めませんでした。消えないよう自動保存を止めています。「白紙に戻す」で保存を再開できます。"); }
    setReady(true);
  }, [loadDraft]);
  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const observer = new ResizeObserver(() => { setWidth(Math.max(240, container.clientWidth)); setHeight(Math.max(320, container.clientHeight)); });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, preview]);
  useEffect(() => {
    if (!ready || !persistenceReady || state.busy || !draft) return;
    try { localStorage.setItem(DRAFT_KEY, serializeDraft(draft)); setStorageError(""); }
    catch { setStorageError("下書きを自動保存できませんでした。ブラウザの保存領域を確認してください。"); }
  }, [ready, persistenceReady, state.busy, draft]);

  const handleStateChange = useCallback((next: OrigamiEditorState) => setState(next), []);
  // 空にした色は反映せず、直前の色を保つ
  const changeColor = (color: string | null) => { if (color !== null) setState((current) => ({ ...current, color })); };
  const reset = () => {
    if (state.steps.length && !window.confirm("現在の手順を消して、白紙から折り直しますか？")) return;
    setState(emptyState()); setSize(100); setName(""); setPreview(null); setGeneration((value) => value + 1); setStorageError(""); setPersistenceReady(true); setMessage("白紙に戻しました。");
  };
  const status = <p className={styles.step} role="status">{ready ? `${state.steps.length}回の折りを記録${state.busy ? "・操作中" : ""}` : "保存した手順を確認しています…"} {message}</p>;
  const alerts = <>
    {storageError && <p className={styles.alert} role="alert">{storageError}</p>}
    {!procedure && <p className={styles.alert} role="alert">この手順は保存できません。最後の操作を元に戻してください。</p>}
  </>;
  if (preview && draft) return <div className={styles.preview}>
    <div className={styles.previewBar}>
      <div className={styles.previewNote}>
        <p className={styles.hint}>いま折った手順を、閲覧ページと同じ表示で確認しています。</p>
        {alerts}
      </div>
      <div className={styles.previewActions}>
        <Button text={preview === "completed" ? "折り方を確認" : "完成形を確認"} variant="secondary" onClick={() => setPreview(preview === "completed" ? "fold" : "completed")} />
        <Button text="折る画面に戻る" onClick={() => setPreview(null)} />
      </div>
    </div>
    <OrigamiViewer key={preview} model={draft.model} startAtEnd={preview === "completed"} />
  </div>;
  return <main id="origami-viewer" className={styles.workshop} data-fullscreen="">
    <div className={styles.top}>
      <div className={styles.heading}>
        <h1 className={styles.title}>{name.trim() || UNTITLED}</h1>
        {status}
        <p className={styles.description}>{guidance(state)}</p>
        {alerts}
      </div>
      <SidePanel className={styles.sidePanel} title="作品" triggerLabel="作品の設定">
        <TextInput label="作品名" value={name} onChange={setName} placeholder="例：鶴" />
        <ColorField label="折り紙の色" value={state.color} onChange={changeColor} isDisabled={!ready} />
        <section className={styles.section} aria-labelledby="post-preview">
          <h3 id="post-preview" className={styles.sectionTitle}>確認</h3>
          <Button text="折り方を確認" variant="secondary" onClick={() => setPreview("fold")} disabled={blocked} />
          <Button text="完成形を確認" variant="secondary" onClick={() => setPreview("completed")} disabled={blocked} />
        </section>
        <section className={styles.section} aria-labelledby="post-publish">
          <h3 id="post-publish" className={styles.sectionTitle}>投稿</h3>
          <PublishButton model={draft?.model ?? null} disabled={blocked} />
        </section>
        <section className={styles.section} aria-labelledby="post-reset">
          <h3 id="post-reset" className={styles.sectionTitle}>やり直し</h3>
          <Button text="白紙に戻す" variant="secondary" onClick={reset} disabled={!ready || state.busy} />
          <p className={styles.hint}>折った手順はこのブラウザに自動で保存され、次に開いたときに続きから折れます。Ctrl+Z（⌘Z）で元に戻し、Ctrl+Shift+Z（⌘⇧Z）でやり直せます。</p>
        </section>
      </SidePanel>
    </div>
    <div className={styles.stage} ref={stage}>
      {ready && (Editor ? <Editor key={generation} initialSteps={state.steps} color={state.color} size={size} cameraPosition={{ x: 0, y: 0, z: (state.viewFront ? 1 : -1) * cameraDistance(size, width, height) }} width={width} height={height} autoResize={false} onStateChange={handleStateChange} /> : <p className={styles.loading} role="status">折り紙を準備しています…</p>)}
    </div>
  </main>;
}
