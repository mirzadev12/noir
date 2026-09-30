import { ImageResponse } from "next/og";

/*
 * The card a shared NOIR link shows: the wordmark and the product's one line,
 * set as a destination sign. ImageResponse cannot read CSS variables, so the
 * three colours below mirror the tokens in app/globals.css (navy, amber marker,
 * on-navy-soft); change them together.
 */
const NAVY = "#07080b";
const AMBER = "#3b82f6";
const ON_NAVY_SOFT = "#a1a8b3";

export const alt = "NOIR: route every unknown wallet to the VASP it must be written to";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          color: "#ffffff",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 2, color: AMBER }}>NOIR</div>
          <div style={{ display: "flex", width: 120, height: 6, background: AMBER, marginTop: 10 }} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 36 }}>
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 4 }}>
            <path d="M3 12h17M13 5l7 7-7 7" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -1.5 }}>
              Every unknown wallet has a destination.
            </div>
            <div style={{ display: "flex", fontSize: 30, marginTop: 28, color: ON_NAVY_SOFT, lineHeight: 1.35 }}>
              Attribute wallets to the nearest VASP in both directions, and send one request to each.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: ON_NAVY_SOFT, borderTop: `2px solid ${ON_NAVY_SOFT}`, paddingTop: 20 }}>
          For Indian cyber-crime investigators · VASP attribution and request routing
        </div>
      </div>
    ),
    size,
  );
}
