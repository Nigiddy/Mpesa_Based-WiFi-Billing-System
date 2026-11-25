import { PROJECT_NAME } from './constants'
import { packages } from './packages'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.yourdomain.com'

/**
 * Schema.org LocalBusiness / InternetServiceProvider schema
 * Enhances local SEO discovery in Kenya for WiFi & ISP queries.
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['InternetServiceProvider', 'LocalBusiness'],
    '@id': `${SITE_URL}/#organization`,
    name: PROJECT_NAME,
    alternateName: ['KIBARUANI', 'KIBARUANI WiFi', 'Qonnect'],
    url: SITE_URL,
    logo: `${SITE_URL}/icons/web-app-manifest-512x512.png`,
    image: `${SITE_URL}/icons/web-app-manifest-512x512.png`,
    description:
      'Fast, reliable, and affordable public and community WiFi internet access in Kenya powered by instant M-Pesa payments.',
    telephone: '+254775551019',
    email: 'support@qonnect.co.ke',
    priceRange: 'KSh 10 - KSh 30',
    currenciesAccepted: 'KES',
    paymentAccepted: ['M-Pesa', 'Cash'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -1.286389,
      longitude: 36.817223,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Kenya',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+254775551019',
        contactType: 'customer support',
        areaServed: 'KE',
        availableLanguage: ['English', 'Swahili'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+254775551019',
        contactType: 'technical support',
        areaServed: 'KE',
        availableLanguage: ['English', 'Swahili'],
      },
    ],
    sameAs: [],
  }
}

/**
 * WebSite Schema with Potential SearchAction
 */
export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: PROJECT_NAME,
    alternateName: 'KIBARUANI WiFi',
    description:
      'Fast, reliable, and affordable internet access powered by M-Pesa payments in Kenya.',
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    inLanguage: 'en-US',
  }
}

/**
 * OfferCatalog & Product schemas for WiFi Packages (Homepage)
 */
export function getWifiPackagesSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE_URL}/#wifi-packages`,
    name: `${PROJECT_NAME} High-Speed WiFi Access`,
    description:
      'Instant unlimited high-speed hotspot internet access in Kenya with automated M-Pesa billing.',
    brand: {
      '@type': 'Brand',
      name: PROJECT_NAME,
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KES',
      lowPrice: '10',
      highPrice: '30',
      offerCount: packages.length,
      offers: packages.map((pkg) => ({
        '@type': 'Offer',
        name: `${pkg.label} Unlimited WiFi Access`,
        description: `${pkg.label} unlimited internet access with speeds up to ${pkg.speed}.`,
        price: pkg.value.toString(),
        priceCurrency: 'KES',
        availability: 'https://schema.org/InStock',
        url: SITE_URL,
        validFrom: '2024-01-01',
        priceValidUntil: '2028-12-31',
        seller: {
          '@id': `${SITE_URL}/#organization`,
        },
      })),
    },
  }
}

/**
 * FAQPage Schema for the Support page
 */
export function getFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * BreadcrumbList Schema
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }
}
