import { redirect } from 'next/navigation'

export default function ReadRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/research?tab=workspace&sessionId=${params.id}`)
}
