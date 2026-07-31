import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"

import { cn } from "@/lib/utils"

interface ContentRendererProps {
    text: string
    className?: string
    style?: React.CSSProperties
}

// Renders plain text with GFM markdown + LaTeX math ($inline$, $$block$$).
// No rehype-raw, so raw HTML in the source is never executed.
export function ContentRenderer({ text, className, style }: ContentRendererProps) {
    return (
        <div className={cn("prose-content", className)} style={style}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[rehypeKatex]}
            >
                {text}
            </ReactMarkdown>
        </div>
    )
}
