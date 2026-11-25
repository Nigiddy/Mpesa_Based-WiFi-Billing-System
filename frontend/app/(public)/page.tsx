import type { Metadata } from 'next'
import { Suspense } from 'react'
import { homeMetadata } from '@/lib/metadata'
import { getWifiPackagesSchema } from '@/lib/schema'
import UserPortal from '@/components/UserPortal'

export const metadata: Metadata = homeMetadata

export default function HomePage() {
  const schema = getWifiPackagesSchema()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
        <UserPortal />
      </Suspense>
    </>
  )
}
