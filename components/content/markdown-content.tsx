'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown 内容渲染器
 * - GFM 语法(表格、任务列表、删除线、autolink)
 * - AI Lens 主题样式
 */
export function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-3xl font-black tracking-tight mt-8 mb-4 pl-3.5 border-l-4 border-coral">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-black tracking-tight mt-10 mb-3 pl-3.5 border-l-4 border-coral">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mt-6 mb-2.5">{children}</h3>,
          p: ({ children }) => <p className="text-[15px] leading-[1.85] text-ink-soft mb-3.5">{children}</p>,
          ul: ({ children }) => <ul className="my-3 ml-5 space-y-2 list-disc marker:text-coral">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 ml-5 space-y-2 list-decimal marker:text-coral marker:font-bold">{children}</ol>,
          li: ({ children }) => <li className="text-[15px] leading-relaxed text-ink-soft [&>strong]:text-ink">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic font-serif text-coral">{children}</em>,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-coral underline hover:text-coral/80">{children}</a>,
          blockquote: ({ children }) => (
            <blockquote className="my-5 px-5 py-3.5 bg-orange-50 border-l-[3px] border-coral rounded-r-lg italic font-serif text-ink [&>p]:mb-0">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) return <code className="text-sm">{children}</code>;
            return <code className="bg-bg-alt px-1.5 py-0.5 rounded text-sm font-mono text-coral">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-4 p-5 bg-ink text-background rounded-xl overflow-x-auto text-sm">{children}</pre>,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-lg border-2 border-ink">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-ink text-background">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2.5 text-left font-bold border-r border-white/10 last:border-r-0">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2.5 border-t border-line text-ink-soft [&:nth-child(even)]:bg-bg-alt/50">{children}</td>,
          hr: () => <hr className="my-8 border-t-2 border-dashed border-line" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
