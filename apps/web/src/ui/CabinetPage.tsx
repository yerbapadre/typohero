import type { ReactNode } from "react";

export function CabinetPage({
  subtitle,
  title,
  children,
}: {
  subtitle?: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-cabinet-bg px-6 pb-12 pt-16 font-pixel text-cabinet-text">
      <header className="text-center">
        <div className="h-4 text-xs uppercase tracking-widest text-cabinet-text/40">{subtitle}</div>
        <h1 className="mt-2 text-2xl font-bold tracking-wide text-white md:text-3xl">{title}</h1>
      </header>
      {children}
    </div>
  );
}
