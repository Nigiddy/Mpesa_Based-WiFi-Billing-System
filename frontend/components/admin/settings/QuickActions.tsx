"use client"

import { useState } from "react"
import { Loader2, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SettingRow, SettingsSection } from "../admin-ui"

interface QuickActionsProps {
  /** Runs straight away; it doesn't wait for Save */
  onDisconnectAll: () => void | Promise<unknown>
  /** People online right now, if you have the number, to show in the confirmation */
  activeCount?: number
}

const DANGER_OUTLINE =
  "border-[hsl(var(--danger)/0.35)] text-[hsl(var(--danger))] hover:bg-[var(--danger-soft)] hover:text-[hsl(var(--danger))]"

/** Danger zone: actions that take effect immediately */
export const QuickActions = ({ onDisconnectAll, activeCount }: QuickActionsProps) => {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      await onDisconnectAll()
      setOpen(false)
    } catch {
      // The hook reports the error. Leave the dialog open so the admin can try again.
    } finally {
      setRunning(false)
    }
  }

  const who =
    activeCount === undefined ? "everyone who's online"
    : activeCount === 1 ? "the 1 person who's online"
    : `all ${activeCount.toLocaleString("en-US")} people who are online`

  return (
    <SettingsSection id="danger-zone" tone="danger" title="Danger zone" description="These run immediately. They don't wait for Save.">
      <SettingRow stack label="Disconnect all users" description="Ends every active connection at once.">
        {/* Stays open until the action finishes, so it can't be sent twice */}
        <AlertDialog open={open} onOpenChange={(next) => { if (!running) setOpen(next) }}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className={`w-full gap-2 sm:w-auto ${DANGER_OUTLINE}`}>
              <WifiOff className="h-4 w-4" aria-hidden />
              Disconnect everyone
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {who}?</AlertDialogTitle>
              <AlertDialogDescription>
                They&rsquo;re cut off straight away and will need to reconnect through the portal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={running}
                onClick={(e) => {
                  e.preventDefault()
                  void run()
                }}
                className="gap-2 bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:bg-[hsl(var(--danger)/0.9)]"
              >
                {running && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {running ? "Disconnecting" : "Disconnect everyone"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingRow>
    </SettingsSection>
  )
}
