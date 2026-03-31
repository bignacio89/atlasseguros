import { redirect } from "next/navigation";

type LegacyClientSignaturesPageProps = {
  params: { id: string };
};

export default function LegacyClientSignaturesPage({
  params,
}: LegacyClientSignaturesPageProps) {
  redirect(`/dashboard/clients/${params.id}/signatures`);
}

