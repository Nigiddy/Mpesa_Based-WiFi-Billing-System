"use client"

import Link from "next/link"
import { Logo } from "./ui/logo"

const footerLinks = {
  "Company": [
    { title: "About", href: "/about" },
    { title: "Blog", href: "/blog" },
  ],
  "Support": [
    { title: "Contact Us", href: "/support" },
    { title: "Help Center", href: "/support#help" },
    { title: "Terms of Service", href: "/support#terms" },
  ],
  "Legal": [
    { title: "Privacy Policy", href: "/support#privacy" },
    { title: "Cookie Policy", href: "/support#cookies" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Logo />
              <span className="text-xl font-bold">Qonnect</span>
            </Link>
            <p className="text-muted-foreground max-w-xs">
              Fast, reliable, and affordable internet for everyone.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Qonnect. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <p className="text-sm text-muted-foreground">
              Powered by M-Pesa
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
