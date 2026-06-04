import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ErrorToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key="error-toast"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed left-1/2 top-4 z-[100] -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 shadow-2xl backdrop-blur-xl">
            <span className="flex-1">{message}</span>
            <button
              onClick={onDismiss}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-red-400/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
              aria-label="Dismiss error"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
