type ClientDetailPageProps = {
  params: { id: string };
};

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  return (
    <div className="text-sm text-slate-600">
      Cliente {params.id} (pendiente de implementar).
    </div>
  );
}
