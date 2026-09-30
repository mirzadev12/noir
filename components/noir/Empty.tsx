/**
 * Empty — what a list says when it has nothing to list: a dashed outline, a
 * plain sentence, and the next action if there is one.
 *
 * Props
 *   title    what is missing ("Nothing is filed yet")
 *   children why, and what to do about it
 *   action   a <Button> or <ButtonLink>, optional
 *
 * Never used for a wallet that could not be read: an unreadable wallet is a
 * finding with its own words, not an empty state.
 */

export function Empty({ title, children, action, className = "" }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`rule-box-dashed p-6 md:p-8 ${className}`}>
      <p className="type-sign text-lead">{title}</p>
      {children ? <div className="mt-2 max-w-prose text-ink-soft">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
