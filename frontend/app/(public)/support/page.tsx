import type { Metadata } from 'next'
import { supportMetadata } from '@/lib/metadata'
import { getFaqSchema, getBreadcrumbSchema } from '@/lib/schema'
import SupportContent from '@/components/SupportContent'
import { supportFaqs } from '@/lib/faqs'

export const metadata: Metadata = supportMetadata

export default function SupportPage() {
  const faqSchema = getFaqSchema(supportFaqs)
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Support', url: '/support' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <SupportContent />
    </>
  )
}
