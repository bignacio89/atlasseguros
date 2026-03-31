type LeadDetailPageProps = {
  params: { id: string };
};

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  return (
    <div className="text-sm text-slate-600">
      Lead {params.id} (pendiente de implementar).
    </div>
  );
}
