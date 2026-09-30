/**
 * ReachFacts — who a request to this VASP is addressed to and where it goes.
 *
 *  - Addressee: the legal name when the FIU-IND annexure lists the VASP, else
 *    the VASP's own name.
 *  - FIU-IND: the one sentence every screen prints (`fiuSentence`), and only when
 *    the annexure lists the VASP. It is a December 2023 fact; a VASP it does not
 *    list is not described at all, because absence proves nothing.
 *  - Law-enforcement channel: where the exchange takes such requests, copied from
 *    its own page on the date shown, with the source. Where no channel was found
 *    the reason is printed. Either way the officer is told to check the source
 *    before relying on it: exchanges change their channels.
 */

import { Facts, RouteLink, Tag, Text, type Fact } from "@/components/noir";
import type { RequestLetter, VaspRow } from "@/lib/desk-types";
import { fiuSentence } from "@/lib/fiu";
import { utcDay } from "@/lib/noir-format";

const KIND = { portal: "Portal", email: "Email", form: "Form" } as const;
const day = (d: string) => utcDay(`${d}T00:00:00Z`);

export function ReachFacts({ row, letter }: { row: VaspRow; letter: RequestLetter }) {
  const le = row.le;
  const channel = !le ? (
    <Text tone="soft">No law-enforcement channel has been recorded for this VASP.</Text>
  ) : le.found ? (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {le.channels.map((c) => (
          <li key={c.href} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <Tag tone="quiet">{KIND[c.kind]}</Tag>
            <RouteLink href={c.href} external>
              {c.label}
            </RouteLink>
          </li>
        ))}
      </ul>
      {le.notes.length > 0 ? (
        <ul className="flex flex-col gap-1 text-small">
          {le.notes.map((n) => (
            <li key={n} className="rule-l pl-3">
              {n}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-small text-ink-soft">
        Copied from the exchange’s own page on {day(le.checked)}: <RouteLink href={le.source} external>{le.source}</RouteLink>. Check the source before relying on it.
      </p>
    </div>
  ) : (
    <div className="flex min-w-0 flex-col gap-2">
      <p>
        <strong>Not found.</strong> {le.reason}
      </p>
      <p className="text-small text-ink-soft">Checked {day(le.checked)}. Check the exchange’s own site before relying on this.</p>
    </div>
  );

  const items: Fact[] = [
    {
      label: "Addressed to",
      value:
        letter.addressee !== row.vasp ? (
          <span>
            <strong>{letter.addressee}</strong>, operating as {row.vasp}
          </span>
        ) : (
          <strong>{letter.addressee}</strong>
        ),
    },
    { label: "FIU-IND", value: row.fiu ? fiuSentence(row.vasp, row.fiu) : null },
    { label: "LE channel", value: channel },
  ];
  return <Facts items={items} />;
}
