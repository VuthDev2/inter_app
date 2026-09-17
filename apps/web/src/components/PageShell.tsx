"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * The frame every content page uses.
 *
 * Each page used to bring its own: some centred their content, some used a
 * 1024px column and some 800px, titles came in two sizes with two different
 * margins, and the primary button was styled four ways. Moving between History
 * and Record read as moving between two apps, and a real change on the page was
 * hard to spot in all that shifting. One shell, one header, one button.
 *
 * The breakpoints follow the phone app rather than the desktop layout: on a
 * narrow screen it wants tighter margins, a smaller title and the primary
 * button on its own line -- the desktop spacing, applied to a phone-width
 * window, spent a third of the screen on padding and squeezed the title
 * against the button.
 */

export function PageShell({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  // `fill` turns the shell into a fixed frame the height of whatever is left of
  // the window -- measured from the app bar, which publishes --appbar-h, rather
  // than asked for from the layout. Bounding it in the layout instead squashed
  // the landing page's 240vh conversation section down to one screen. for pages whose content is a list that can run to any length.
  // The default -- the page gets taller and the whole window scrolls -- is
  // right for a page you read top to bottom and wrong for a list: the header
  // and the tabs scrolled away, and the card holding the rows grew without
  // limit instead of the rows scrolling inside it. The phone app never does
  // that, and this is what makes the web behave the same way.
  if (fill) {
    return (
      <main className="mx-auto flex h-[calc(100dvh-var(--appbar-h,0px))] min-h-0 w-full max-w-7xl flex-col px-4 pt-6 pb-4 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        {children}
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">{children}</main>
  );
}

/**
 * The one part of a `fill` shell that scrolls.
 *
 * The negative margin with matching padding keeps the scrollbar off the content
 * without shifting it sideways: the track sits in the gutter the shell already
 * has.
 */
export function ScrollArea({ children }: { children: ReactNode }) {
  return (
    <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pb-10 pr-2">{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string;
  subtitle?: string;
  /** The one primary button for this page, on the right. */
  action?: ReactNode;
  /** Shown left of the title on pages you arrive at from another page. */
  backHref?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="mt-1.5 shrink-0 text-[rgba(var(--muted),1)] transition-colors hover:text-[rgb(var(--text))]"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-wide text-[rgba(var(--text),0.9)] sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-[rgba(var(--muted),1)]">{subtitle}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-fit shrink-0 items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--text))] shadow-lg shadow-[rgba(var(--primary),0.2)] transition-colors hover:bg-[rgb(var(--primary-pressed))]"
    >
      {children}
    </Link>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-wide text-[rgba(var(--text),0.9)]">
        {children}
      </h2>
      {action}
    </div>
  );
}

/** The bordered card every list and settings group sits in. */
export function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      {children}
    </section>
  );
}
