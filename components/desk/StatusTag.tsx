import { Tag } from "@/components/noir";
import type { RequestStatus } from "@/lib/desk-types";
import { STATUS_LABEL } from "@/lib/requests";

/**
 * StatusTag — where a request stands, in the status colours: waiting in
 * amber-brown (drafted, sent, no response yet), answered in green
 * (acknowledged, data received, frozen), refused in red. The words carry the
 * meaning; the colour only speeds the scan.
 */
const LOOK: Record<RequestStatus, { tone: "plain" | "ok" | "wait" | "prohibit"; icon?: "clock" | "check" | "close" }> = {
  drafted: { tone: "plain" },
  sent: { tone: "wait", icon: "clock" },
  acknowledged: { tone: "ok" },
  "data-received": { tone: "ok", icon: "check" },
  frozen: { tone: "ok", icon: "check" },
  refused: { tone: "prohibit", icon: "close" },
  "no-response": { tone: "wait", icon: "clock" },
};

export function StatusTag({ status }: { status: RequestStatus }) {
  const look = LOOK[status];
  return (
    <Tag tone={look.tone} icon={look.icon}>
      {STATUS_LABEL[status]}
    </Tag>
  );
}
