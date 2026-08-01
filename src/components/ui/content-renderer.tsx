import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"

import { cn } from "@/lib/utils"
import { sanitizeJatsMarkup } from "@/lib/jatsMarkup"

interface ContentRendererProps {
    text: string
    className?: string
    style?: React.CSSProperties
}

const rehypeKatexOptions = { throwOnError: false, strict: false }

// Renders plain text with GFM markdown + LaTeX math ($inline$, $$block$$).
// No rehype-raw, so raw HTML in the source is never executed. Publisher
// abstracts (bioRxiv/medRxiv/Crossref) often arrive as JATS XML fragments
// rather than plain text, so those get normalized to markdown/$..$ first.
export function ContentRenderer({ text, className, style }: ContentRendererProps) {
    return (
        <div className={cn("prose-content", className)} style={style}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[[rehypeKatex, rehypeKatexOptions]]}
            >
                {sanitizeJatsMarkup(text)}
            </ReactMarkdown>
        </div>
    )
}
