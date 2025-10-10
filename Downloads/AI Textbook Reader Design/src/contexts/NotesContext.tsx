import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useTextbook } from './TextbookContext';
import { toast } from 'sonner';
import { fetchWithRetry } from '../lib/fetchWithRetry';

interface Note {
  id: string;
  title: string;
  content: string;
  page_number: number | null;
  position: any | null;
  updated_at: string;
}

interface NotesContextType {
  notes: Note[];
  activeNote: Note | null;
  loading: boolean;
  saving: boolean;
  createNote: () => Promise<void>;
  selectNote: (noteId: string) => void;
  updateNoteContent: (content: string) => void;
  updateNoteTitle: (title: string) => void;
  deleteNote: (noteId: string) => Promise<void>;
  loadNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

let saveTimeout: NodeJS.Timeout;

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentTextbook, currentPage } = useTextbook();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Helper: Ensure valid session for notes operations
  const ensureValidSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.warn('[Notes] No valid session found');
        return false;
      }
      return true;
    } catch (error) {
      console.error('[Notes] Error checking session:', error);
      return false;
    }
  };

  // Load all notes for current textbook
  const loadNotes = useCallback(async (retryCount = 0) => {
    if (!user || !currentTextbook) return;

    try {
      setLoading(true);
      
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession && retryCount === 0) {
        await supabase.auth.refreshSession();
        return loadNotes(1);
      }

      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('textbook_id', currentTextbook.id)
        .order('updated_at', { ascending: false });

      if (error) {
        // Retry on auth errors
        if (retryCount === 0 && (error.code === '406' || error.message?.includes('JWT'))) {
          await supabase.auth.refreshSession();
          return loadNotes(1);
        }
        throw error;
      }

      const notesData = (data || []).map(note => ({
        ...note,
        title: note.content?.split('\n')[0]?.substring(0, 50) || 'Untitled Note'
      }));

      setNotes(notesData);
      
      // Select the most recent note by default
      if (notesData.length > 0 && !activeNote) {
        setActiveNote(notesData[0]);
      }
    } catch (error) {
      console.error('[Notes] Failed to load notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [user, currentTextbook, activeNote]);

  // Create a new note
  const createNote = async (retryCount = 0) => {
    if (!user || !currentTextbook) return;

    try {
      setSaving(true);
      
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession && retryCount === 0) {
        await supabase.auth.refreshSession();
        return createNote(1);
      }

      const { data, error } = await supabase
        .from('user_notes')
        .insert({
          user_id: user.id,
          textbook_id: currentTextbook.id,
          page_number: currentPage,
          content: '',
        })
        .select()
        .single();

      if (error) {
        // Retry on auth errors
        if (retryCount === 0 && (error.code === '406' || error.message?.includes('JWT'))) {
          await supabase.auth.refreshSession();
          return createNote(1);
        }
        throw error;
      }

      const newNote: Note = {
        ...data,
        title: 'Untitled Note'
      };

      setNotes(prev => [newNote, ...prev]);
      setActiveNote(newNote);
      toast.success('New note created');
    } catch (error) {
      console.error('[Notes] Failed to create note:', error);
      toast.error('Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  // Select a note
  const selectNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setActiveNote(note);
    }
  };

  // Auto-save function with retry logic
  const autoSave = useCallback(async (retryCount = 0) => {
    if (!activeNote || !user) return;

    try {
      setSaving(true);
      
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession && retryCount === 0) {
        await supabase.auth.refreshSession();
        return autoSave(1);
      }

      const { error } = await supabase
        .from('user_notes')
        .update({
          content: activeNote.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeNote.id);

      if (error) {
        // Retry on auth errors
        if (retryCount === 0 && (error.code === '406' || error.message?.includes('JWT'))) {
          await supabase.auth.refreshSession();
          return autoSave(1);
        }
        throw error;
      }

      // Update title based on first line
      const newTitle = activeNote.content.split('\n')[0]?.substring(0, 50) || 'Untitled Note';
      setNotes(prev => prev.map(n => 
        n.id === activeNote.id 
          ? { ...n, title: newTitle, content: activeNote.content, updated_at: new Date().toISOString() }
          : n
      ));
    } catch (error) {
      console.error('[Notes] Auto-save failed:', error);
      if (retryCount === 0) {
        toast.error('Failed to save note. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }, [activeNote, user]);

  // Update note content
  const updateNoteContent = (content: string) => {
    if (!activeNote) return;
    setActiveNote({ ...activeNote, content });
  };

  // Update note title
  const updateNoteTitle = (title: string) => {
    if (!activeNote) return;
    setActiveNote({ ...activeNote, title });
  };

  // Delete a note with retry logic
  const deleteNote = async (noteId: string, retryCount = 0) => {
    if (!user) return;

    try {
      // Ensure valid session
      const hasValidSession = await ensureValidSession();
      if (!hasValidSession && retryCount === 0) {
        await supabase.auth.refreshSession();
        return deleteNote(noteId, 1);
      }

      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        // Retry on auth errors
        if (retryCount === 0 && (error.code === '406' || error.message?.includes('JWT'))) {
          await supabase.auth.refreshSession();
          return deleteNote(noteId, 1);
        }
        throw error;
      }

      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      
      if (activeNote?.id === noteId) {
        setActiveNote(updatedNotes.length > 0 ? updatedNotes[0] : null);
      }

      toast.success('Note deleted');
    } catch (error) {
      console.error('[Notes] Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!activeNote || activeNote.content === '') return;

    const timeout = setTimeout(() => {
      autoSave();
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timeout);
  }, [activeNote?.content, autoSave]);

  // Load notes when textbook changes
  useEffect(() => {
    if (currentTextbook) {
      loadNotes();
    }
  }, [currentTextbook]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNote,
        loading,
        saving,
        createNote,
        selectNote,
        updateNoteContent,
        updateNoteTitle,
        deleteNote,
        loadNotes,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}

