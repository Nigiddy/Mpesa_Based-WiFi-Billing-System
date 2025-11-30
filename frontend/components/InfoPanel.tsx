import { Card, CardContent } from "@/components/ui/card"
import { HelpCircle, Clock, Smartphone } from "lucide-react"
import Link from "next/link"

const supportItems = [
  {
    icon: <HelpCircle className="w-5 h-5 text-primary" />,
    title: "Need Help?",
    description: "Visit our support page for FAQs and tutorials.",
    link: "/support",
  },
  {
    icon: <Clock className="w-5 h-5 text-primary" />,
    title: "Check Status",
    description: "View real-time network status and updates.",
    link: "/status",
  },
  {
    icon: <Smartphone className="w-5 h-5 text-primary" />,
    title: "Contact Us",
    description: "Get in touch with our 24/7 support team.",
    link: "/support#contact",
  },
]

const InfoPanel = () => (
  <Card className="bg-background/80 backdrop-blur-sm border-border/60">
    <CardContent className="pt-6">
      <ul className="space-y-4">
        {supportItems.map((item) => (
          <li key={item.title}>
            <Link
              href={item.link}
              className="flex items-center p-3 -m-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-primary">
                {item.icon}
              </div>
              <div className="ml-4">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)

export default InfoPanel
