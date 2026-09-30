"use client";

/**
 * IntakeBox — how wallets reach the desk: paste one address, paste a list, or
 * drop a CSV (`address[,chain][,case]`, header optional), with an optional case
 * reference that fills any line that has none. Nothing here reads a chain; the
 * server checks every line, files the good ones as pending and says why it
 * refused the rest, by line number.
 *
 * Props
 *   variant     "hero" (the landing page's big paste box) | "rail" (the desk's side column)
 *   redirectTo  where to go after a successful filing; without it the page refreshes in place
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Field, Heading, Icon, Mono, Notice, TextArea, TextInput } from "@/components/noir";
import type { DeskEntry, IntakeLine } from "@/lib/desk-types";
import { count } from "@/lib/noir-format";
import { call } from "./net";

type Filed = { added: DeskEntry[]; merged: DeskEntry[]; rejected: Extract<IntakeLine, { ok: false }>[] };

/** The server refuses a filing over 64 KB (about 500 wallets); a file is checked here first so the reason is instant. */
const MAX_FILE_BYTES = 64 * 1024;
const noun = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

/** Lines that will be sent: not blank, not a # comment. Only a rough count; the server is the judge. */
const countLines = (text: string) => text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;

export function IntakeBox({ variant = "rail", redirectTo }: { variant?: "hero" | "rail"; redirectTo?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [caseRef, setCaseRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<Filed | null>(null);
  const hero = variant === "hero";
  const id = hero ? "hero" : "rail";

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setProblem("That file is larger than 64 KB. NOIR takes at most 500 wallets at a time; split the list.");
      return;
    }
    const content = await file.text();
    setText((t) => (t.trim() ? `${t.replace(/\s+$/, "")}\n${content}` : content));
    setProblem(null);
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setProblem("Paste at least one wallet address first.");
      return;
    }
    setBusy(true);
    setProblem(null);
    setResult(null);
    const r = await call<Filed>("POST", "/api/desk", { text, caseRef: caseRef.trim() || undefined });
    setBusy(false);
    if (r.ok) {
      setResult(r.data);
      if (r.data.rejected.length === 0) setText("");
      if (redirectTo && r.data.rejected.length === 0) router.push(redirectTo);
      else router.refresh();
      return;
    }
    const body = r.data as Partial<Filed> | null;
    if (r.status === 422 && body?.rejected) {
      setResult({ added: [], merged: [], rejected: body.rejected });
      setProblem("None of those lines could be filed. Nothing was added to the desk.");
    } else {
      setProblem(r.error);
    }
  }

  const lines = countLines(text);

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-5" aria-busy={busy}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void readFile(e.dataTransfer.files[0]);
        }}
      >
        <label htmlFor={`${id}-text`} className="block">
          <Heading level={2} size={hero ? "title" : "lead"} className="mb-3">
            {hero ? "Paste a wallet, or a list" : "File wallets"}
          </Heading>
        </label>
        <TextArea
          id={`${id}-text`}
          mono
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={hero ? 6 : 5}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={"One TRON, Ethereum or Polygon address per line,\nor CSV: address, chain, case"}
          className={`${hero ? "min-h-48" : ""} ${over ? "border-route" : ""}`}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-soft">
          <span>Drop a CSV here, or</span>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a CSV or text file"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="text" size="sm" onClick={() => fileInput.current?.click()}>
            choose a file
          </Button>
          <span className="type-mono ml-auto">{noun(lines, "line")}</span>
        </p>
      </div>

      <Field label="Case reference (optional)" htmlFor={`${id}-case`} hint="Filled into any line that has no case of its own.">
        <TextInput id={`${id}-case`} value={caseRef} onChange={(e) => setCaseRef(e.target.value)} maxLength={80} autoComplete="off" placeholder="FIR 14/2026" />
      </Field>

      <div>
        <Button type="submit" busy={busy} icon="arrow-right">
          {busy ? "Filing…" : "File to the desk"}
        </Button>
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3 empty:hidden">
        {problem ? <Notice tone="stop">{problem}</Notice> : null}
        {result && (result.added.length > 0 || result.merged.length > 0) ? (
          <Notice>
            Filed {noun(result.added.length, "new wallet")}
            {result.merged.length > 0 ? `, and added a filing to ${noun(result.merged.length, "wallet")} already on the desk` : ""}.
            {result.added.length > 0 ? " They are being read now." : ""}
            {hero ? (
              <>
                {" "}
                <Link href="/desk" className="font-bold">
                  See them on the desk <Icon name="arrow-right" size="sm" className="inline-block align-[-0.1em]" />
                </Link>
              </>
            ) : null}
          </Notice>
        ) : null}
        {result && result.rejected.length > 0 ? (
          <Notice tone="caution" title={`${noun(result.rejected.length, "line")} not filed`}>
            <ul className="mt-2 flex flex-col gap-2">
              {result.rejected.map((l) => (
                <li key={l.line} className="text-small">
                  <span className="type-mono mr-2 font-bold">Line {l.line}</span>
                  <Mono soft>{l.raw.length > 60 ? `${l.raw.slice(0, 60)}…` : l.raw}</Mono>
                  <span className="block">{l.reason}</span>
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}
      </div>
    </form>
  );
}
