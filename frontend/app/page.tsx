"use client"

import { Phone, Zap, Wifi, Shield, ArrowRight, Sparkles, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import Link from "next/link"
import { packages } from "@/lib/packages"
import { usePayment } from "@/hooks/use-payment"

export default function UserPortal() {
  useDynamicTitle("Get Connected Instantly")
  const {
    phone,
    amount,
    status,
    isLoading,
    macAddress,
    handlePhoneChange,
    setAmount,
    handlePayment,
  } = usePayment()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* PREMIUM HERO SECTION */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 },
            },
          }}
          className="relative py-16 lg:py-24 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/15 rounded-full blur-3xl"
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1 },
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Instant Activation • M-Pesa Payment
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              <span>Seamless </span>
              <span className="gradient-text">WiFi Access</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Get online in seconds. Choose a package, pay with M-Pesa, and enjoy
              high-speed internet. It's that simple.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="mb-12"
            >
              <Link href="/packages">
                <Button variant="premium" size="lg" className="px-8 group">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex flex-wrap justify-center gap-6 lg:gap-12 pt-12 border-t border-border/30"
            >
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  5,000+
                </div>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-success">99.9%</div>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">
                  {"<"}30s
                </div>
                <p className="text-sm text-muted-foreground">Activation</p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* QUICK CONNECT SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-12 lg:py-16"
        >
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Card */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                  <CardTitle className="flex items-center text-2xl">
                    <div className="p-2 rounded-lg bg-primary/20 mr-3">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    Quick Connect
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    3 simple steps to instant internet
                  </p>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  {/* Step 1 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                        1
                      </div>
                      <Label className="text-base font-semibold">
                        Enter M-Pesa Number
                      </Label>
                    </div>
                    <div className="relative ml-11">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="0712345678"
                        value={phone}
                        onChange={handlePhoneChange}
                        maxLength={10}
                        className="pl-10 h-11 focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </motion.div>

                  {/* Step 2 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">
                        2
                      </div>
                      <Label className="text-base font-semibold">
                        Select Package
                      </Label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-11">
                      {packages.slice(0, 4).map((pkg) => (
                        <motion.button
                          key={pkg.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setAmount(pkg.value)}
                          className={`p-3 rounded-lg border-2 transition-all text-center ${
                            amount === pkg.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-bold text-sm text-primary">
                            KSh {pkg.price}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {pkg.label}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Step 3 */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                    className="space-y-3 pt-6 border-t"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-success text-white font-bold text-sm">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <Label className="text-base font-semibold">
                        Proceed to Payment
                      </Label>
                    </div>
                    <div className="ml-11">
                      <Button
                        onClick={handlePayment}
                        disabled={isLoading || phone.length !== 10 || !amount}
                        variant="premium"
                        size="lg"
                        fullWidth
                        loading={isLoading}
                      >
                        {!isLoading && (
                          <>
                            Pay KSh{" "}
                            {packages.find((p) => p.value === amount)?.price}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        🔒 256-bit SSL encrypted • M-Pesa verified
                      </p>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </div>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {/* Device Info */}
              <Card variant="glass">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">📱 Connected Device</h4>
                  <code className="text-xs font-mono text-muted-foreground break-all">
                    {macAddress || "Detecting..."}
                  </code>
                </CardContent>
              </Card>

              {/* Trust Signals */}
              {[
                { icon: "🔐", text: "SSL Encrypted" },
                { icon: "✅", text: "M-Pesa Verified" },
                { icon: "⚡", text: "Instant Setup" },
              ].map((signal, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card variant="glass">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{signal.icon}</span>
                        <span className="font-medium">{signal.text}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* WHY CHOOSE US */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-16 lg:py-20"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
            Why Choose KIBARUANI
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Secure & Encrypted",
                description: "Your payment is protected with 256-bit SSL encryption",
              },
              {
                icon: Zap,
                title: "Instant Activation",
                description: "Connected to high-speed WiFi in under 30 seconds",
              },
              {
                icon: Wifi,
                title: "Reliable Network",
                description: "99.9% uptime with 24/7 customer support",
              },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -4 }}
                >
                  <Card variant="interactive">
                    <CardContent className="pt-8 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 mb-4">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-12 lg:py-16"
        >
          <Card variant="elevated" className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-12 md:p-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Join Thousands of Happy Users
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Enjoy fast, reliable WiFi with instant M-Pesa payment
              </p>
              <Link href="/packages">
                <Button variant="premium" size="lg">
                  Browse All Plans
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  )
}