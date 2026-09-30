"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Mono, Notice, Page, PageHead } from "@/components/noir";

/**
 * Anything that throws while a screen renders lands here. It says so in plain
 * words, offers to try again, and gives the server's reference so the failure
 * can be found in its log. It never shows a blank screen, and it never
 * pretends the desk is empty.
 */
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page>
      <PageHead title="This screen could not be drawn" lede="Nothing on the desk was changed." />
      <div className="mt-8 flex max-w-prose flex-col gap-6">
        <Notice tone="stop" title="Something failed on the server">
          Trying again usually works. If it does not, the desk file on the server may be unreadable; NOIR will not show an empty desk in its place.
          {error.digest ? (
            <span className="mt-2 block text-small">
              Reference for the server log: <Mono>{error.digest}</Mono>
            </span>
          ) : null}
        </Notice>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => retry()} icon="refresh">
            Try again
          </Button>
          <ButtonLink href="/desk" variant="outline">
            Go to the desk
          </ButtonLink>
        </div>
      </div>
    </Page>
  );
}
