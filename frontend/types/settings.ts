export interface SystemSettings {
    maxConcurrentUsers: number
    sessionTimeout: number
    autoDisconnect: boolean
    maintenanceMode: boolean
    mpesaTimeout: number
    defaultPackage: "1hour" | "4hours" | "12hours" | "24hours"
}

export type NetworkSettings = Pick<SystemSettings, "maxConcurrentUsers" | "sessionTimeout" | "autoDisconnect">
export type PaymentSettings = Pick<SystemSettings, "mpesaTimeout" | "defaultPackage">
export type SystemControlSettings = Pick<SystemSettings, "maintenanceMode">
