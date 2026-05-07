export const MESSAGES = {
  ERRORS: {
    FETCH_USERS: "Failed to load users",
    FETCH_TRANSACTIONS: "Failed to load transactions",
    FETCH_SETTINGS: "Failed to load settings",
    FETCH_VOUCHERS: "Failed to load vouchers",
    GENERATE_VOUCHERS: "Failed to generate vouchers",
    REFUND_FAILED: "Refund failed",
    ACTION_FAILED: "Action failed",
    UNKNOWN_ERROR: "Unknown error occurred",
    DEFAULT: "An unexpected error occurred. Please try again.",
  },
  SUCCESS: {
    USER_BLOCKED: "User blocked successfully",
    USER_UNBLOCKED: "User unblocked successfully",
    USER_DISCONNECTED: "User disconnected successfully",
    USER_DELETED: "User deleted successfully",
    REFUND_PROCESSED: "Refund processed successfully",
    SETTINGS_SAVED: "Settings saved successfully",
    VOUCHERS_GENERATED: "Voucher(s) generated",
    NETWORK_RESTARTED: "Network service restarted successfully",
    DB_BACKUP: "Database backup completed",
    ALL_USERS_DISCONNECTED: "All users disconnected",
  },
  PAYMENT: {
    SUCCESS: "Payment Successful!",
    FAILED: "Payment Failed",
    TIMEOUT: "Prompt Expired",
    INITIALIZING: "Initializing Payment",
  },
  CONFIRMATIONS: {
    DELETE_USER: "Are you sure you want to delete this user? This action cannot be undone.",
    REFUND_TRANSACTION: "Are you sure you want to refund this transaction? This action cannot be undone.",
  }
}
