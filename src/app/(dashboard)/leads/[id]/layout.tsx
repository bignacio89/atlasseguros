import type { ReactNode } from "react";

type LeadDetailLayoutProps = {
  children: ReactNode;
};

export default function LeadDetailLayout({ children }: LeadDetailLayoutProps) {
  return <>{children}</>;
}
