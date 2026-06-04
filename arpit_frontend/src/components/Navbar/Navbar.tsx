import { motion } from 'framer-motion';
import { Settings, Mic } from 'lucide-react';
import { StatusIndicator } from '../StatusIndicator/StatusIndicator';
import type { ConnectionStatus, ListeningStatus } from '../../types/voice';
import { LanguageSelector } from '../LanguageSelector/LanguageSelector';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  listeningStatus: ListeningStatus;
  onSettingsClick: () => void;
}

export function Navbar({ connectionStatus, listeningStatus, onSettingsClick }: NavbarProps) {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <Mic className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Voice Agent</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusIndicator connectionStatus={connectionStatus} listeningStatus={listeningStatus} />
          <LanguageSelector/>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}
