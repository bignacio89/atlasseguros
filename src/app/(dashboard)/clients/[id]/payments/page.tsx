import { redirect } from "next/navigation";

type LegacyClientPaymentsPageProps = {
  params: { id: string };
};

export default function LegacyClientPaymentsPage({ params }: LegacyClientPaymentsPageProps) {
  redirect(`/dashboard/clients/${params.id}/payments`);
}

