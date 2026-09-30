"use client";

/**
 * CopyButton — copies a value (an address, a hash, a reference) to the
 * clipboard and says so, the way an explorer does beside every address. It is a
 * real button with an accessible name; the confirmation is announced politely and
 * clears itself. If the clipboard is blocked nothing breaks: the value is still
 * on screen to select.
 */

import { useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={`${label}: ${value}`}
      className="inline-flex min-h-6 min-w-6 cursor-pointer items-center gap-1 align-middle text-small text-route transition-colors hover:text-ink print:hidden"
    >
      <Icon name={done ? "check" : "copy"} size="sm" />
      <span className={done ? "" : "sr-only"} aria-live="polite">
        {done ? "Copied" : label}
      </span>
    </button>
  );
}
