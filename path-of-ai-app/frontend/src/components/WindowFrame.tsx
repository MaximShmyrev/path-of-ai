import type { ReactNode } from 'react';

type WindowFrameProps = {
  title?: string;
  children: ReactNode;
};

export function WindowFrame({ title, children }: WindowFrameProps) {
  return (
    <section className="window-frame">
      {title !== undefined && <h2 className="window-frame__title">{title}</h2>}
      {children}
    </section>
  );
}
