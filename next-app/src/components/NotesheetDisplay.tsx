"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function NotesheetDisplay({
  notesheet,
  loading,
}: {
  notesheet: string | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
          Notesheet
        </h3>
        <div className="flex items-center justify-center py-12 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          Generating notesheet...
        </div>
      </div>
    );
  }

  if (!notesheet) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-slate-900 font-semibold mb-3 text-sm uppercase tracking-wider">
          Notesheet
        </h3>
        <p className="text-sm text-slate-500 text-center py-8">
          No notesheet yet. Upload a PDF or video to generate one.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">
        Notesheet
      </h3>
      <div className="notesheet-content text-sm text-slate-900 leading-relaxed space-y-3 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-blue-600 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-slate-500 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-2 [&_strong]:text-slate-900 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-slate-200 [&_td]:p-2 [&_td]:border-b [&_td]:border-slate-200 [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-slate-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_hr]:border-slate-200">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {notesheet}
        </ReactMarkdown>
      </div>
    </div>
  );
}
