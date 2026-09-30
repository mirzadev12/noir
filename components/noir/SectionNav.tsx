/**
 * SectionNav — the strip of in-page links under a screen's head, like the tabs
 * on an explorer's address page: one link per section, jumping to it. On a phone
 * it scrolls sideways inside itself, never the page.
 *
 * Props
 *   items  [{ href: "#route", label: "Route" }, …] — only sections that exist
 */

export function SectionNav({ items, label = "On this page" }: { items: { href: string; label: string }[]; label?: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="rule-b print:hidden">
      <ul className="flex min-w-0 gap-6 overflow-x-auto">
        {items.map((i) => (
          <li key={i.href} className="shrink-0">
            <a href={i.href} className="type-sign inline-block py-3 text-body no-underline hover:underline">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
