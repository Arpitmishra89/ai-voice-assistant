import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Message } from '../../types/message';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubbleInner({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
          isUser
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white'
            : 'bg-white/5 text-zinc-200 backdrop-blur-sm'
        }`}
      >
        <p className="text-sm leading-relaxed sm:text-base">{message.content}</p>
        <span
          className={`mt-1 block text-[10px] sm:text-xs ${
            isUser ? 'text-white/60' : 'text-zinc-500'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
