import type { ReactNode } from 'react';

/**
 * Gemeinsamer Rahmen der Rechtstexte.
 *
 * Ein Abschnitt besteht aus Überschrift und Absätzen; Aufzählungen entstehen
 * aus Absätzen, die mit „· " beginnen. Damit liegt der gesamte Text in den
 * Sprachdateien und lässt sich übersetzen, ohne dass jemand JSX anfassen muss.
 */
export type LegalSection = {
  heading: string;
  body: string[];
};

export function LegalPage({
  title,
  intro,
  updated,
  sections,
  children,
}: {
  title: string;
  intro?: string;
  /** Stand des Dokuments, bereits formatiert. */
  updated?: string;
  sections: LegalSection[];
  /** Zusätzlicher Inhalt vor den Abschnitten, etwa die Betreiberangaben. */
  children?: ReactNode;
}) {
  return (
    <div className="lv-container max-w-3xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>

      {intro ? <p className="text-muted-foreground mt-4 text-base">{intro}</p> : null}
      {updated ? <p className="text-muted-foreground mt-2 text-sm">{updated}</p> : null}

      {children ? <div className="mt-8">{children}</div> : null}

      <div className="mt-10 space-y-9">
        {sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">
              <span className="text-muted-foreground mr-2 font-normal tabular-nums">
                {index + 1}.
              </span>
              {section.heading}
            </h2>

            <div className="mt-3 space-y-3">
              {groupParagraphs(section.body).map((block, blockIndex) =>
                block.kind === 'list' ? (
                  <ul
                    key={blockIndex}
                    className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm leading-relaxed"
                  >
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p
                    key={blockIndex}
                    className="text-muted-foreground text-sm leading-relaxed"
                  >
                    {block.text}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

/**
 * Fasst aufeinanderfolgende Aufzählungszeilen zu einer Liste zusammen. Ohne
 * das entstünde je Punkt eine eigene Liste, und Bildschirmleser meldeten
 * „Liste mit einem Eintrag“ statt einer zusammenhängenden Aufzählung.
 */
export function groupParagraphs(body: string[]): Block[] {
  const blocks: Block[] = [];

  for (const line of body) {
    if (line.startsWith('· ')) {
      const last = blocks[blocks.length - 1];
      const item = line.slice(2);

      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else {
      blocks.push({ kind: 'paragraph', text: line });
    }
  }

  return blocks;
}
