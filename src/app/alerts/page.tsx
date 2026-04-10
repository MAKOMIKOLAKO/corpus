import { redirect } from 'next/navigation'

export default function AlertsRedirectPage() {
  redirect('/research?tab=discover')
}
