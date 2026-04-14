import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReadRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/research?tab=workspace&sessionId=${params.id}`)
}
