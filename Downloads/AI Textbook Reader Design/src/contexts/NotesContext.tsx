import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useTextbook } from './TextbookContext';
import { toast } from 'sonner';

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

  // Load all notes for current textbook
  const loadNotes = useCallback(async () => {
    if (!user || !currentTextbook) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('textbook_id', currentTextbook.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

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
  const createNote = async () => {
    if (!user || !currentTextbook) return;

    try {
      setSaving(true);

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

      if (error) throw error;

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

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!activeNote || !user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_notes')
        .update({
          content: activeNote.content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeNote.id);

      if (error) throw error;

      // Update title based on first line
      const newTitle = activeNote.content.split('\n')[0]?.substring(0, 50) || 'Untitled Note';
      setNotes(prev => prev.map(n => 
        n.id === activeNote.id 
          ? { ...n, title: newTitle, content: activeNote.content, updated_at: new Date().toISOString() }
          : n
      ));
    } catch (error) {
      console.error('[Notes] Auto-save failed:', error);
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

  // Delete a note
  const deleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(n => n.id !== noteId));
      
      if (activeNote?.id === noteId) {
        setActiveNote(notes[0] || null);
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

