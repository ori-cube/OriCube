"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button, FileButton, TextInput } from "@oricube/design-system";
import type { OrigamiEditorState } from "@/components/v2/OrigamiPost";
import { OrigamiViewer } from "@/components/v2/OrigamiViewer";
import { exportProcedureV2 } from "@/components/v2/OrigamiPost/utils/exportProcedureV2";
import { MOCK_DRAFT_KEY, mockModule, parseMockDraft, restoreHistory, saveMockFile, serializeMockDraft, type MockDraft } from "./mockAuthoring";
import styles from "./MockWorkshop.module.css";

const Editor = dynamic(() => import("@/components/v2/OrigamiPost").then((module) => module.OrigamiPostV2), { ssr: false, loading: () => <p role="status">折り紙を準備しています…</p> });
const emptyState = (): OrigamiEditorState => ({ steps: [], color: "#ed7070", viewFront: true, busy: false });

export function MockWorkshop() {
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
  const procedure = useMemo(() => exportProcedureV2({ size, steps: state.steps }), [size, state.steps]);
  const draft: MockDraft | null = useMemo(() => procedure ? { model: { id: "crane", name: name.trim() || "鶴", description: "UIで折った鶴の手順です。", color: state.color, procedure }, viewFront: state.viewFront } : null, [procedure, name, state.color, state.viewFront]);
  const blocked = !ready || state.busy || !draft;

  const loadDraft = useCallback((next: MockDraft) => {
    setState({ steps: restoreHistory(next.model.procedure.history), color: next.model.color, viewFront: next.viewFront, busy: false });
    setSize(next.model.procedure.size); setName(next.model.name); setPreview(null);
    setGeneration((value) => value + 1); setError(""); setStorageError(""); setPersistenceReady(true);
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
    const observer = new ResizeObserver(() => setWidth(Math.max(240, container.clientWidth)));
    observer.observe(container);
    return () => observer.disconnect();
  }, [ready, preview]);
  useEffect(() => {
    if (!ready || !persistenceReady || state.busy || !draft) return;
    try { localStorage.setItem(MOCK_DRAFT_KEY, serializeMockDraft(draft)); setStorageError(""); }
    catch { setStorageError("ブラウザに保存できませんでした。「JSONを保存」で手順を残してください。"); }
  }, [ready, persistenceReady, state.busy, draft]);

  const handleStateChange = useCallback((next: OrigamiEditorState) => setState(next), []);
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
  const controls = <div className={styles.actions}>
    <FileButton text="JSONを読み込む" variant="secondary" acceptedFileTypes={[".json", "application/json"]} onSelect={readFile} disabled={!ready || state.busy} />
    <Button text="JSONを保存" onClick={() => save(false)} disabled={blocked} />
    <Button text="モック用TSを保存" variant="secondary" onClick={() => save(true)} disabled={blocked} />
    <Button text="白紙に戻す" variant="secondary" onClick={reset} disabled={!ready || state.busy} />
    <Button text={preview ? "折る画面に戻る" : "折り方を確認"} variant="secondary" onClick={() => setPreview(preview ? null : "fold")} disabled={blocked} />
    <Button text="完成形を確認" variant="secondary" onClick={() => setPreview("completed")} disabled={blocked || preview === "completed"} />
  </div>;
  const heading = <>
    <h1>鶴のモックを折る</h1>
    <p>頂点をドラッグして折り、重なる場合は折り方を選びます。最後に「JSONを保存」で手順を共有してください。</p>
    <p>確定した手順はこのブラウザに自動保存します。別のブラウザや端末へ移す場合はJSONを使えます。</p>
    <TextInput label="作品名" value={name} onChange={setName} />
    {controls}
    <p role="status">{ready ? `${state.steps.length}回の折りを記録${state.busy ? "・操作中" : ""}` : "保存した手順を確認しています…"} {message}</p>
    {error && <p role="alert">{error}</p>}
    {storageError && <p role="alert">{storageError}</p>}
    {!procedure && <p role="alert">この手順を書き出せません。折る画面で最後の操作を戻してください。</p>}
  </>;
  if (preview && draft) return <div className={styles.workshop}>
    <div>{heading}</div>
    <OrigamiViewer key={preview} model={draft.model} completed={preview === "completed"} showNavigation={false} />
  </div>;
  return <main id="origami-viewer" className={styles.workshop}>
    {heading}
    <div className={styles.stage} ref={stage}>
      {ready && <Editor key={generation} initialSteps={state.steps} defaultOrigamiColor={state.color} size={size} cameraPosition={{ x: 0, y: 0, z: (state.viewFront ? 1 : -1) * size * 1.8 / Math.min(width / 600, 1) }} width={width} height={600} autoResize={false} onStateChange={handleStateChange} />}
    </div>
  </main>;
}
