"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Download, Users } from "lucide-react"
import { toast } from "sonner"
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
    onRestart: () => void
    onBackup: () => void
    onDisconnectAll: () => void
}

export const QuickActions = ({ onRestart, onBackup, onDisconnectAll }: QuickActionsProps) => {
    const handleFactoryReset = () => {
        toast.error("Factory reset not implemented", {
            description: "This is a dangerous operation that requires manual intervention",
        })
    }

    return (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={onRestart}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart Network Service
                </Button>

                <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={onBackup}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Backup Database
                </Button>

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

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                        >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Factory Reset
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Factory Reset</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to perform a factory reset? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 focus:ring-red-600" onClick={handleFactoryReset}>
                                Reset
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}
