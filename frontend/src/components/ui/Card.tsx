import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  children: ReactNode;
}

/** Surface panel used across the console. */
export function Card({ title, children, ...props }: CardProps) {
  return (
    <section data-component="card" {...props}>
      {title ? <header>{title}</header> : null}
      <div>{children}</div>
    </section>
  );
}
