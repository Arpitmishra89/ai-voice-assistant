import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types/message';

interface ConversationPanelProps {
  messages: Message[];
}

function ConversationPanelInner({ messages }: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mx-auto w-full max-w-2xl"
    >
      <div className="max-h-[40vh] overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm scrollbar-thin sm:max-h-[45vh] sm:p-6">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <span className="text-xl">🎙️</span>
              </div>
              <p className="text-sm text-zinc-500">How can I help you today?</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-3 last:mb-0"
            >
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}

export const ConversationPanel = memo(ConversationPanelInner);
