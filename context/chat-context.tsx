import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { AiChatWidget } from '@/components/ai-chat-widget';
import { useAuth } from '@/context/auth-context';
import { API_BASE_URL } from '@/lib/api';

interface ChatContextValue {
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const { userId } = useAuth();

  const endpoint = useMemo(() => {
    const base = `${API_BASE_URL}/ai/chat`;
    return userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
  }, [userId]);

  return (
    <ChatContext.Provider value={{ openChat: () => setOpen(true), closeChat: () => setOpen(false) }}>
      {children}
      <AiChatWidget
        endpoint={endpoint}
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