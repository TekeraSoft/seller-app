import { createContext, PropsWithChildren, useContext, useState } from 'react';

import { AiChatWidget } from '@/components/ai-chat-widget';
import { useAuth } from '@/context/auth-context';

const CHAT_ENDPOINT = 'https://onlinechat.tekera21.com.tr/chat';

interface ChatContextValue {
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const { userId } = useAuth();

  return (
    <ChatContext.Provider value={{ openChat: () => setOpen(true), closeChat: () => setOpen(false) }}>
      {children}
      <AiChatWidget
        endpoint={CHAT_ENDPOINT}
        userId={userId ?? null}
        hideFab
        open={open}
        onOpenChange={setOpen}
      />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}