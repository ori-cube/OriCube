"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Button, ColorField, FileButton, SidePanel, TextInput } from "@oricube/design-system";
import type { OrigamiEditorState, OrigamiPostV2Props } from "../../components/OrigamiPost";
import { OrigamiViewer } from "../../components/OrigamiViewer";
import { exportProcedureV2 } from "@oricube/engine";
import { MOCK_DRAFT_KEY, mockModule, parseMockDraft, restoreHistory, saveMockFile, serializeMockDraft, type MockDraft } from "./mockAuthoring";
import styles from "./MockWorkshop.module.css";

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

export function MockWorkshop() {
  // WebGLを使う編集画面はブラウザでだけ読み込む（サーバー描画・フレームワークに依存しない）
  const [Editor, setEditor] = useState<ComponentType<OrigamiPostV2Props> | null>(null);
  const [state, setState] = useState(emptyState);
  const [size, setSize] = useState(100);
  const [name, setName] = useState("鶴");
  const [ready, setReady] = useState(false);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [preview, setPreview] = useState<"fold" | "completed" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const procedure = useMemo(() => exportProcedureV2({ size, steps: state.steps }), [size, state.steps]);
  const draft: MockDraft | null = useMemo(() => procedure ? { model: { id: "crane", name: name.trim() || "鶴", description: "UIで折った鶴の手順です。", color: state.color, procedure }, viewFront: state.viewFront } : null, [procedure, name, state.color, state.viewFront]);
  const blocked = !ready || state.busy || !draft;

  const loadDraft = useCallback((next: MockDraft) => {
    setState({ steps: restoreHistory(next.model.procedure.history), color: next.model.color, viewFront: next.viewFront, busy: false, phase: "idle" });
    setSize(next.model.procedure.size); setName(next.model.name); setPreview(null);
    setGeneration((value) => value + 1); setError(""); setStorageError(""); setPersistenceReady(true);
  }, []);
  useEffect(() => {
    let active = true;
    void import("../../components/OrigamiPost").then((module) => { if (active) setEditor(() => module.OrigamiPostV2); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MOCK_DRAFT_KEY);
      if (saved) { loadDraft(parseMockDraft(saved)); setMessage("保存した手順を復元しました。"); }
      else setPersistenceReady(true);
    } catch { setStorageError("保存した下書きを読み込めませんでした。上書きを止めています。JSONを読み込むか、「白紙に戻す」で保存を再開できます。"); }
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
    try { localStorage.setItem(MOCK_DRAFT_KEY, serializeMockDraft(draft)); setStorageError(""); }
    catch { setStorageError("ブラウザに保存できませんでした。「JSONを保存」で手順を残してください。"); }
  }, [ready, persistenceReady, state.busy, draft]);

  const handleStateChange = useCallback((next: OrigamiEditorState) => setState(next), []);
  // 空にした色は反映せず、直前の色を保つ
  const changeColor = (color: string | null) => { if (color !== null) setState((current) => ({ ...current, color })); };
  const readFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("5MB以下のJSONを選んでください。");
      const next = parseMockDraft(await file.text());
      if (state.steps.length && !window.confirm("現在の手順を、選んだJSONの手順に置き換えますか？")) return;
      loadDraft(next); setMessage("JSONの手順を読み込みました。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "JSONを読み込めませんでした。"); }
  };
  const reset = () => {
    if (state.steps.length && !window.confirm("現在の手順を消して、白紙から折り直しますか？")) return;
    setState(emptyState()); setSize(100); setName("鶴"); setPreview(null); setGeneration((value) => value + 1); setError(""); setStorageError(""); setPersistenceReady(true); setMessage("白紙に戻しました。");
  };
  const save = (module: boolean) => {
    if (!draft || state.busy) return;
    try { saveMockFile(module ? "recorded-crane.ts" : "crane.json", module ? mockModule(draft.model) : serializeMockDraft(draft)); setError(""); setMessage(module ? "モック用TSを保存しました。" : "JSONを保存しました。"); }
    catch { setError("ファイルを保存できませんでした。もう一度お試しください。"); }
  };
  const status = <p className={styles.step} role="status">{ready ? `${state.steps.length}回の折りを記録${state.busy ? "・操作中" : ""}` : "保存した手順を確認しています…"} {message}</p>;
  const alerts = <>
    {error && <p className={styles.alert} role="alert">{error}</p>}
    {storageError && <p className={styles.alert} role="alert">{storageError}</p>}
    {!procedure && <p className={styles.alert} role="alert">この手順を書き出せません。最後の操作を元に戻してください。</p>}
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
        <h1 className={styles.title}>{name.trim() || "鶴"}のモックを折る</h1>
        {status}
        <p className={styles.description}>{guidance(state)}</p>
        {alerts}
      </div>
      <SidePanel className={styles.sidePanel} title="作品" triggerLabel="作品の設定と保存">
        <TextInput label="作品名" value={name} onChange={setName} />
        <ColorField label="折り紙の色" value={state.color} onChange={changeColor} isDisabled={!ready} />
        <section className={styles.section} aria-labelledby="workshop-preview">
          <h3 id="workshop-preview" className={styles.sectionTitle}>確認</h3>
          <Button text="折り方を確認" variant="secondary" onClick={() => setPreview("fold")} disabled={blocked} />
          <Button text="完成形を確認" variant="secondary" onClick={() => setPreview("completed")} disabled={blocked} />
        </section>
        <section className={styles.section} aria-labelledby="workshop-save">
          <h3 id="workshop-save" className={styles.sectionTitle}>保存と読み込み</h3>
          <p className={styles.hint}>確定した手順はこのブラウザに自動保存します。別のブラウザや端末へ移すときはJSONを使います。</p>
          <Button text="JSONを保存" onClick={() => save(false)} disabled={blocked} />
          <FileButton text="JSONを読み込む" variant="secondary" acceptedFileTypes={[".json", "application/json"]} onSelect={readFile} disabled={!ready || state.busy} />
          <Button text="モック用TSを保存" variant="secondary" onClick={() => save(true)} disabled={blocked} />
        </section>
        <section className={styles.section} aria-labelledby="workshop-reset">
          <h3 id="workshop-reset" className={styles.sectionTitle}>やり直し</h3>
          <Button text="白紙に戻す" variant="secondary" onClick={reset} disabled={!ready || state.busy} />
          <p className={styles.hint}>Ctrl+Z（⌘Z）で元に戻し、Ctrl+Shift+Z（⌘⇧Z）でやり直せます。</p>
        </section>
      </SidePanel>
    </div>
    <div className={styles.stage} ref={stage}>
      {ready && (Editor ? <Editor key={generation} initialSteps={state.steps} color={state.color} size={size} cameraPosition={{ x: 0, y: 0, z: (state.viewFront ? 1 : -1) * cameraDistance(size, width, height) }} width={width} height={height} autoResize={false} onStateChange={handleStateChange} /> : <p className={styles.loading} role="status">折り紙を準備しています…</p>)}
    </div>
  </main>;
}
