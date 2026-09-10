"use client";

/**
 * The phone app's segmented control, on the web.
 *
 * Three flat words in a rounded trough with one filled pill sliding between
 * them. The pill is a single absolutely-positioned element rather than a
 * background on the active button, because that is what lets it *travel*: a
 * per-button background can only pop from one place to the next.
 *
 * Sized in percentages of the trough, so it stays correct at every width
 * without measuring anything -- the phone has to measure (onLayout) because
 * React Native has no percentage transforms.
 *
 * Two deliberate choices about colour:
 *
 * The trough is a translucent wash of the text colour, not a solid grey fill.
 * A solid --surface-muted bar across the full width read as a slab of grey
 * dropped on the page -- the one flat, opaque thing in an otherwise deep dark
 * layout. Tinting the background that shows through keeps it part of the page.
 *
 * The pill is the brand blue with a soft glow, not a raised surface. In the
 * dark theme --surface (37,40,46) and --surface-muted (32,36,43) are five
 * values apart, so a surface-coloured pill on a muted trough was invisible.
 * The blue is what makes the selection legible, and it is the same blue the
 * active label already uses.
 */
export default function SegmentedTabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string }[];
}) {
  const index = Math.max(0, tabs.findIndex((tab) => tab.value === value));
  // The trough's 0.25rem padding on each side is taken off the top before the
  // remainder is split, so the pill lands exactly on a button. The buttons sit
  // flush against each other, so travelling one whole pill-width per step is
  // all the positioning that is needed.

  return (
    <div
      role="tablist"
      className="relative mb-8 flex rounded-full border border-[rgba(var(--text),0.07)] bg-[rgba(var(--text),0.04)] p-1 backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-[rgb(var(--primary))]/18 shadow-lg shadow-[rgb(var(--primary))]/20 ring-1 ring-inset ring-[rgb(var(--primary))]/40 transition-transform duration-300 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${tabs.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative z-10 flex-1 truncate rounded-full px-2 py-2.5 text-[13px] font-semibold transition-colors sm:text-sm ${
            value === tab.value
              ? "text-[rgb(var(--primary))]"
              : "text-[rgba(var(--muted),1)] hover:text-[rgba(var(--text),0.8)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
