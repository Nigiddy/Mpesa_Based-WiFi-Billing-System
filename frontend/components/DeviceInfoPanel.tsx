import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Wifi } from "lucide-react"

const DeviceInfoPanel = ({ macAddress }: { macAddress: string }) => (
  <Card className="bg-background/80 backdrop-blur-sm border-border/60">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">Device Info</CardTitle>
      <Wifi className="w-4 h-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-xs text-muted-foreground">MAC Address</div>
      <div className="text-lg font-mono font-bold tracking-widest">{macAddress}</div>
    </CardContent>
  </Card>
)

export default DeviceInfoPanel
