import type { Metadata } from 'next'
import { aboutMetadata } from '@/lib/metadata'
import { getBreadcrumbSchema } from '@/lib/schema'
import AboutContent from '@/components/AboutContent'

export const metadata: Metadata = aboutMetadata

export default function AboutPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'About Us', url: '/about' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AboutContent />
    </>
  )
}
