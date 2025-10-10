import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useTextbook } from './TextbookContext';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentTextbook, currentPage, currentPageData, currentAIContent } = useTextbook();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Load existing conversation
  const loadConversation = async () => {
    if (!user || !currentTextbook) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('textbook_id', currentTextbook.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConversationId(data.id);
        setMessages((data.messages as ChatMessage[]) || []);
      } else {
        // Create new conversation
        const { data: newConv, error: insertError } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            textbook_id: currentTextbook.id,
            context_pages: [currentPage],
            messages: [],
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newConv) {
          setConversationId(newConv.id);
        }
      }
    } catch (error) {
      console.error('[Chat] Failed to load conversation:', error);
    }
  };

  // Send message and get AI response
  const sendMessage = async (content: string) => {
    if (!user || !currentTextbook || !conversationId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    // Add user message optimistically
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Get chapter summary for enhanced context
      let chapterSummary = '';
      try {
        const { data: chapter } = await supabase
          .from('chapters')
          .select('chapter_summaries(*)')
          .eq('textbook_id', currentTextbook.id)
          .lte('page_start', currentPage)
          .gte('page_end', currentPage)
          .single();
        
        if (chapter?.chapter_summaries?.[0]) {
          chapterSummary = chapter.chapter_summaries[0].summary_text;
        }
      } catch (e) {
        console.log('[Chat] No chapter summary available');
      }

      // Call chat API with full context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          context: {
            pageText: currentPageData?.raw_text || '',
            summary: chapterSummary,
            page: currentPage,
          },
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage, aiMessage];
      setMessages(updatedMessages);

      // Save to database
      await supabase
        .from('chat_conversations')
        .update({
          messages: updatedMessages,
          context_pages: [currentPage],
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      toast.error('Failed to send message. Chat API not configured yet.');
      
      // Add mock response for development
      const mockResponse: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but the AI chat service is not yet configured. Please set up the OpenAI API endpoint to enable this feature.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, mockResponse]);
    } finally {
      setLoading(false);
    }
  };

  // Clear chat history
  const clearChat = async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('chat_conversations')
        .update({
          messages: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      setMessages([]);
      toast.success('Chat cleared');
    } catch (error) {
      console.error('[Chat] Failed to clear chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  // Load conversation on mount
  useEffect(() => {
    if (user && currentTextbook) {
      loadConversation();
    }
  }, [user, currentTextbook]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        loading,
        sendMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

