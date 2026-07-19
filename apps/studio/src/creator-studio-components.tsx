import type { ReactNode } from "react";

export function CreatorStudioShell({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return <div className={className}>{children}</div>;
}
