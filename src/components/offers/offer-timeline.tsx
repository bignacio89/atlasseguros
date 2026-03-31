import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { UserRole } from "@prisma/client";

type TimelineComment = {
  id: string;
  body: string;
  authorRole: UserRole;
  createdAt: Date;
  author: {
    name: string;
    email: string;
  };
};

type OfferTimelineProps = {
  comments: TimelineComment[];
};

export function OfferTimeline({ comments }: OfferTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900 mb-4">Timeline</h2>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay comentarios.</p>
      ) : (
        <ol className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-sm text-slate-900">
                  <span className="font-medium">{comment.author.name}</span>
                  <span className="text-slate-500"> ({comment.author.email})</span>
                </div>
                <span className="text-xs text-slate-500">
                  {format(comment.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </span>
              </div>
              <div className="mb-2">
                <span className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700">
                  {comment.authorRole}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

