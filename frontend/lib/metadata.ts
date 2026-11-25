import { Metadata } from 'next'
import { PROJECT_NAME } from './constants'

export interface PageMetadataOptions {
  title?: string
  description?: string
  image?: string
  noIndex?: boolean
  canonical?: string
}

const DEFAULT_DESCRIPTION =
  'Fast, reliable, and affordable public and community WiFi internet access powered by M-Pesa payments in Kenya.'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.yourdomain.com'

/**
 * Standard icons configuration for Next.js 14 App Router
 * Complies with modern web standards and Google Search Favicon guidelines:
 * - /favicon.ico (Multi-size fallback for legacy browsers)
 * - /icons/favicon.svg (Scalable vector favicon for modern high-DPI screens)
 * - /icons/favicon-96x96.png (Standard 96x96 PNG icon)
 * - /apple-touch-icon.png (180x180 for iOS home screen bookmarks)
 * - /site.webmanifest (PWA / Android install manifest)
 */
export const defaultIcons = {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/icons/favicon.svg', type: 'image/svg+xml' },
    { url: '/icons/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
  ],
  shortcut: '/favicon.ico',
  apple: [
    { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  ],
  other: [
    {
      rel: 'apple-touch-icon-precomposed',
      url: '/icons/apple-touch-icon.png',
    },
  ],
}

/**
 * Generate comprehensive, clean Metadata for Next.js App Router
 * Note: Keywords tag intentionally excluded as modern search engines (Googlebot, Bingbot)
 * do not use it for ranking.
 */
export function generateMetadata(options: PageMetadataOptions = {}): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    image = '/icons/web-app-manifest-512x512.png',
    noIndex = false,
    canonical,
  } = options

  const defaultTitle = `${PROJECT_NAME} | Fast & Affordable High-Speed Internet in Kenya`

  const resolvedTitle = title
    ? title
    : {
        default: defaultTitle,
        template: `%s | ${PROJECT_NAME}`,
      }

  const ogTitle = typeof title === 'string' ? title : defaultTitle

  return {
    metadataBase: new URL(SITE_URL),
    title: resolvedTitle,
    description,
    applicationName: PROJECT_NAME,
    authors: [{ name: PROJECT_NAME }],
    creator: PROJECT_NAME,
    publisher: PROJECT_NAME,
    manifest: '/site.webmanifest',
    icons: defaultIcons,
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
    openGraph: {
      title: ogTitle,
      description,
      url: canonical || SITE_URL,
      siteName: PROJECT_NAME,
      images: [
        {
          url: image,
          width: 512,
          height: 512,
          alt: `${PROJECT_NAME} WiFi Kenya`,
        },
      ],
      locale: 'en_KE',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: ogTitle,
      description,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  }
}

export function generatePageMetadata(
  pageTitle: string,
  description?: string,
  options: Partial<PageMetadataOptions> = {}
): Metadata {
  return generateMetadata({
    title: pageTitle,
    description,
    ...options,
  })
}

// Predefined metadata for common routes
export const homeMetadata: Metadata = generateMetadata({
  title: 'Instant High-Speed WiFi Packages in Kenya | Pay via M-Pesa',
  description:
    'Get connected instantly to high-speed Qonnect WiFi in Kenya. Flexible 1hr, 4hr, 12hr, and 24hr unlimited packages payable via instant M-Pesa STK push.',
  canonical: '/',
})

export const aboutMetadata: Metadata = generatePageMetadata(
  'About Us | Reliable Community WiFi Hotspots in Kenya',
  'Learn about Qonnect WiFi, our mission to bridge the digital divide, our expanding hotspot coverage in Kenya, and our affordable internet plans.',
  { canonical: '/about' }
)

export const supportMetadata: Metadata = generatePageMetadata(
  'Support & FAQs | WiFi Billing & Connection Help',
  'Get 24/7 help with your Qonnect WiFi connection, M-Pesa payment verification, voucher issues, or technical troubleshooting.',
  { canonical: '/support' }
)

export const adminMetadata: Metadata = generateMetadata({
  title: 'Admin Portal',
  description: 'Qonnect WiFi Network Administration and Monitoring Dashboard.',
  noIndex: true,
})
