"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Users, Shield, Zap, Heart, Target, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const teamMembers = [
  {
    name: "John Kamau",
    role: "Founder & CEO",
    image: "/placeholder-user.jpg",
    description: "Visionary leader with 10+ years in telecommunications.",
    fallback: "JK",
  },
  {
    name: "Sarah Wanjiku",
    role: "Chief Technology Officer",
    image: "/placeholder-user.jpg",
    description: "Expert in network security and scalable system architecture.",
    fallback: "SW",
  },
  {
    name: "David Ochieng",
    role: "Head of Operations",
    image: "/placeholder-user.jpg",
    description: "Ensuring 99.9% uptime and a seamless customer experience.",
    fallback: "DO",
  },
]

const values = [
  {
    icon: <Shield />,
    title: "Integrity",
    description: "We uphold the highest standards of security and privacy.",
  },
  {
    icon: <Zap />,
    title: "Performance",
    description: "Delivering consistent high-speed internet with reliability.",
  },
  {
    icon: <Heart />,
    title: "Customer-Centric",
    description: "Our customers are at the heart of everything we build.",
  },
  {
    icon: <Target />,
    title: "Innovation",
    description: "Continuously pushing the boundaries of connectivity.",
  },
]

export default function AboutPage() {
  useDynamicTitle("About Us - Qonnect")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            Connecting Communities
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            We are a team of passionate innovators dedicated to providing seamless,
            high-speed internet access to everyone.
          </p>
        </motion.div>

        {/* Story Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Journey</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Qonnect was founded on a simple premise: internet access should be
                a utility, not a luxury. Frustrated by the digital divide, our
                founders set out to build a service that was both affordable and
                exceptionally reliable.
              </p>
              <p>
                From our first hotspot in Nairobi, we've expanded our network to
                serve thousands of users, all while maintaining our commitment to
                customer satisfaction and technological excellence.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative h-64 lg:h-80"
          >
            <img
              src="/placeholder.jpg"
              alt="Qonnect Network"
              className="rounded-lg shadow-lg w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-extrabold text-center text-foreground mb-12">
            Our Core Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-extrabold text-center text-foreground mb-12">
            Meet the Leaders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center bg-background/80 backdrop-blur-sm border-border/60">
                  <CardContent className="p-6">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                      <AvatarImage src={member.image} alt={member.name} />
                      <AvatarFallback>{member.fallback}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold text-foreground">
                      {member.name}
                    </h3>
                    <p className="text-primary font-medium mb-2">{member.role}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
