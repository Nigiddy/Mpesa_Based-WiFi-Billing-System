"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  WifiOff,
  Home,
  ArrowLeft,
  LifeBuoy,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  const pathname = usePathname();
  const router = useRouter();

 useEffect(() => {
  console.warn(
    "[QONNECT 404] Unknown route:",
    pathname
  );
}, [pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden relative">

      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/10 blur-3xl" />

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
          }}
          className="absolute inset-0"
        >
          <div className="absolute left-1/2 top-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10" />
        </motion.div>
      </div>

      <div className="relative z-10 text-center px-6 max-w-2xl">

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: .8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .4 }}
          className="mb-8"
        >
          <motion.div
            animate={{
              y: [0, -6, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
            }}
          >
            <WifiOff className="w-24 h-24 mx-auto text-primary" />
          </motion.div>
        </motion.div>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-8xl font-black tracking-tight text-primary mb-3"
        >
          404
        </motion.h1>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: .2 }}
        >
          <h2 className="text-3xl font-semibold mb-3">
            Connection lost.
          </h2>

          <p className="text-muted-foreground max-w-lg mx-auto leading-7">
            The page you requested doesn’t exist or may have moved.
          </p>

          <div className="mt-5 inline-flex items-center rounded-full border px-4 py-2 text-sm text-muted-foreground">
            Requested route:
            <span className="ml-2 font-mono text-foreground">
              {pathname}
            </span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: .3 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Home
            </Link>
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: .5 }}
          className="mt-12"
        >
          <Link
            href="/support"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <LifeBuoy className="h-4 w-4" />
            Need help? Contact support
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;