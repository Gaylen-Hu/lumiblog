import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { slugify } from '@/lib/toc'

export default function ArticleMarkdown({ content, title }: { content: string; title: string }) {
  const firstContentLine = content.match(/^\s*/)?.[0].split('\n').length
  return <div id="post-body" className="markdown-content">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ node, children, ...props }) => {
          const id = slugify(String(children))
          if (node?.position?.start.line === firstContentLine && String(children).trim() === title.trim()) {
            return <span id={id} aria-hidden="true" />
          }
          return <h2 id={id} {...props}>{children}</h2>
        },
        h2: ({ children, id, className }) => (
          <h2 id={id ?? slugify(String(children))} className={className}>{children}</h2>
        ),
        h3: ({ children, id, className }) => (
          <h3 id={id ?? slugify(String(children))} className={className}>{children}</h3>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
}
