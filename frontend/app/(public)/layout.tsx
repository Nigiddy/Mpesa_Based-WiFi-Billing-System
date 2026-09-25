import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

/**
 * Layout for public-facing pages (home, about, support).
 * Admin routes live under app/admin/ and do NOT inherit this layout,
 * so <Header> and <Footer> never appear on the admin dashboard.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </>
  )
}
