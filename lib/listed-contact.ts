/**
 * The OFAC-listed address a wallet's money reached, when its trace saw one.
 *
 * A record flags a wallet two ways already: the wallet itself is listed
 * (`sanctioned`), or its trail ended at a listed address and no VASP was
 * reached (`outboundStop: "sanctioned"`). There is a third case the record
 * keeps only as a typology: part of the money reached a listed address and
 * part went on to an exchange. That wallet has a VASP to write to and a
 * listing to report, and it must be flagged like the other two.
 *
 * The typology names the address; the listing is looked up again here, against
 * the same OFAC table screening uses, so a contact with a mixer (which shares
 * the typology's code) is never called a listing.
 *
 * Server-only: it reads the sanctions tables.
 */

import type { AttributionRecord } from "./desk-types";
import { screenAddress } from "./screen";
import type { ListedContact } from "./trace-graph";

export function listedContact(record: AttributionRecord | null | undefined): ListedContact | null {
  if (!record || !record.readable) return null;
  for (const t of record.typologies ?? []) {
    if (t.code !== "SANCTIONED_CONTACT") continue;
    const listing = screenAddress(t.at).listing;
    if (listing) return { address: t.at, entity: listing.entity };
  }
  return null;
}
