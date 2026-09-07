"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface QuickActionsProps {
    onDisconnectAll: () => void
}

export const QuickActions = ({ onDisconnectAll }: QuickActionsProps) => {
    return (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full justify-start bg-transparent"
                        >
                            <Users className="h-4 w-4 mr-2" />
                            Disconnect All Users
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will disconnect every currently connected user. They will need to log in again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={onDisconnectAll}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </CardContent>
        </Card>
    )
}
