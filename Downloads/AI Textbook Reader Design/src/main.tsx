
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './contexts/AuthContext';
import { TextbookProvider } from './contexts/TextbookContext';
import { NotesProvider } from './contexts/NotesContext';
import { ChatProvider } from './contexts/ChatContext';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TextbookProvider>
        <NotesProvider>
          <ChatProvider>
            <App />
            <Toaster position="top-right" />
          </ChatProvider>
        </NotesProvider>
      </TextbookProvider>
    </AuthProvider>
  </QueryClientProvider>
);
  