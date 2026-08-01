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
