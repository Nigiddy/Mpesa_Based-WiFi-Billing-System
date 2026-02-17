"use client"

import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Users, Shield, Zap, Heart, Target, Award, Wifi, TrendingUp, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "CEO & Founder",
    description: "Visionary leader with 10+ years in telecommunications.",
    image: "/team/sarah.jpg",
    fallback: "SJ",
  },
  {
    name: "James Kimani",
    role: "CTO",
    description: "Tech innovator passionate about connectivity solutions.",
    image: "/team/james.jpg",
    fallback: "JK",
  },
  {
    name: "Grace Mwangi",
    role: "Head of Operations",
    description: "Operations expert ensuring seamless service delivery.",
    image: "/team/grace.jpg",
    fallback: "GM",
  },
]

const values = [
  {
    icon: Shield,
    title: "Integrity",
    description: "We uphold the highest standards of security and privacy.",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Delivering consistent high-speed internet with reliability.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
  },
  {
    icon: Heart,
    title: "Customer-Centric",
    description: "Our customers are at the heart of everything we build.",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Target,
    title: "Innovation",
    description: "Continuously pushing the boundaries of connectivity.",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
]

const stats = [
  {
    icon: Users,
    number: "10K+",
    label: "Happy Customers",
    color: "text-primary",
  },
  {
    icon: Wifi,
    number: "50+",
    label: "Hotspot Locations",
    color: "text-blue-600",
  },
  {
    icon: TrendingUp,
    number: "99.9%",
    label: "Uptime Guarantee",
    color: "text-green-600",
  },
  {
    icon: MapPin,
    number: "5",
    label: "Cities Covered",
    color: "text-purple-600",
  },
]

export default function AboutPage() {
  useDynamicTitle("About Us - Qonnect")

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-20 lg:py-28">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 relative"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Trusted by Thousands</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Connecting{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
                Communities
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We are a team of passionate innovators dedicated to providing seamless,
             
              high-speed internet access to everyone, powered by convenient M-Pesa payments.
            </p>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20 relative"
          >
            {stats.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center"
                >
                  <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="p-0">
                      <div className={cn("w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3", stat.color)}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="text-3xl font-bold text-foreground mb-1">
                        {stat.number}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {stat.label}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Story Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">Our Story</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              The Journey That Defines Us
            </h2>
            <div className="space-y-4 text-base lg:text-lg text-muted-foreground leading-relaxed">
              <p>
                Qonnect was founded on a simple premise: internet access should be
                a utility, not a luxury. Frustrated by the digital divide, our
                founders set out to build a service that was both affordable and
                exceptionally reliable.
              </p>
              <p>
                From our first hotspot in Nairobi, we've expanded our network to
                serve thousands of users, all while maintaining our commitment to
                customer satisfaction and technological excellence. By integrating
                M-Pesa payments, we've made connectivity accessible to everyone.
              </p>
              <p className="text-foreground font-medium">
                Today, we're proud to be Kenya's fastest-growing WiFi billing platform.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative h-64 lg:h-96 rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-2xl" />
              <img
                src="/api/placeholder/800/600"
                alt="Qonnect Network"
                className="rounded-2xl w-full h-full object-cover"
              />
              {/* Overlay badge */}
              <div className="absolute bottom-6 left-6 right-6 bg-background/90 backdrop-blur-md rounded-xl p-4 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Serving Communities</div>
                    <div className="text-xs text-muted-foreground">Since 2020</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Values Section */}
        <div className="py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Heart className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-600">What Drives Us</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Our Core Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide every decision we make and every service we deliver.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const IconComponent = value.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full p-6 bg-background/50 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-0 text-center">
                      <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4", value.bgColor)}>
                        <IconComponent className={cn("w-7 h-7", value.color)} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        {value.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Team Section */}
        <div className="py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-green-600">Our Team</span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Meet the Leaders
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate minds behind Qonnect's mission to connect communities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center bg-background/50 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 overflow-hidden group">
                  <CardContent className="p-8">
                    <div className="relative mb-6">
                      <Avatar className="w-28 h-28 mx-auto border-4 border-primary/20 group-hover:border-primary/40 transition-all duration-300">
                        <AvatarImage src={member.image} alt={member.name} />
                        <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-blue-600 text-white">
                          {member.fallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {member.name}
                    </h3>
                    <p className="text-primary font-semibold mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}