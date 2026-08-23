// Publisher abstracts (bioRxiv/medRxiv RSS, Crossref, PubMed) are often JATS XML
// fragments rather than plain text, e.g. `<italic>foo</italic>` or
// `<inline-formula><tex-math notation="LaTeX">E=mc^2</tex-math></inline-formula>`.
// This converts the common tags into Markdown + KaTeX-flavored `$...$` so
// ContentRenderer can render them, and drops anything it doesn't recognize.
const ZERO_WIDTH_CHARS = /[\u200B-\u200D\uFEFF]/g

export function sanitizeJatsMarkup(text: string): string {
    let result = text

    // Collapse duplicate <alternatives> reps of the same formula (tex-math + mml:math),
    // keeping only the tex-math one.
    result = result.replace(
        /<alternatives>\s*<tex-math[^>]*>([\s\S]*?)<\/tex-math>[\s\S]*?<\/alternatives>/gi,
        (_match, texMath) => `<tex-math>${texMath}</tex-math>`
    )

    result = result.replace(
        /<inline-formula>\s*<tex-math[^>]*>([\s\S]*?)<\/tex-math>\s*<\/inline-formula>/gi,
        (_match, texMath) => {
            const cleaned = texMath
                .replace(ZERO_WIDTH_CHARS, '')
                .replace(/\s+/g, ' ')
                .trim()
            return cleaned ? `$${cleaned}$` : ''
        }
    )

    result = result
        .replace(/<\/?(italic|i)>/gi, '*')
        .replace(/<\/?(bold|b)>/gi, '**')
        .replace(/<\/?(sup|sub)>/gi, '')
        // Any remaining JATS/HTML tags we don't special-case: drop them, keep inner text.
        .replace(/<[^>]+>/g, ' ')
        .replace(ZERO_WIDTH_CHARS, '')

    return result.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

// For text-mining uses (keyword extraction, embeddings) rather than rendering:
// strips JATS/HTML markup *and* math content entirely, rather than converting it
// to markdown/KaTeX. LaTeX commands like `\mathrm`, `\alpha`, `\cdot` tokenize into
// words that are frequent across unrelated math-heavy abstracts, so left in they
// dominate keyword/embedding signal and skew results toward "papers about LaTeX"
// instead of the paper's actual topic.
export function stripMarkupAndMath(text: string): string {
    let result = sanitizeJatsMarkup(text)

    result = result
        // Math spans (from sanitizeJatsMarkup's $...$ wrapping, or raw LaTeX source).
        // Only treat a $...$ pair as math (and drop it) when the interior actually looks
        // like math — a LaTeX command, subscript/superscript, or braces — so plain prose
        // that happens to mention two dollar amounts (e.g. "$5 per unit and $10 total")
        // isn't misread as one math span spanning both figures.
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\$([^$\n]{1,300}?)\$/g, (match, inner: string) =>
            /[\\^_{}]/.test(inner) ? ' ' : match
        )
        .replace(/\\\([\s\S]*?\\\)/g, ' ')
        .replace(/\\\[[\s\S]*?\\\]/g, ' ')
        // Any stray LaTeX commands outside math delimiters (e.g. unwrapped \textit{...}).
        .replace(/\\[a-zA-Z]+\*?/g, ' ')

    return result.replace(/\s+/g, ' ').trim()
}
