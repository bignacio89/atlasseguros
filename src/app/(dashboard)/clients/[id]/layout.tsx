import type { ReactNode } from "react";

type ClientDetailLayoutProps = {
  children: ReactNode;
};

export default function ClientDetailLayout({ children }: ClientDetailLayoutProps) {
  return <>{children}</>;
}
