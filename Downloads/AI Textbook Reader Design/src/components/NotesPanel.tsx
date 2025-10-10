import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { Plus, Loader2, Download, FileDown, Trash2, FileText } from 'lucide-react';
import { useNotes } from '../contexts/NotesContext';
import { useTextbook } from '../contexts/TextbookContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

export function NotesPanel() {
  const { notes, activeNote, createNote, selectNote, updateNoteContent, deleteNote, saving, loading } = useNotes();
  const { currentTextbook } = useTextbook();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (noteToDelete) {
      await deleteNote(noteToDelete);
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  // Export active note as Markdown
  const exportAsMarkdown = () => {
    if (!activeNote?.content.trim()) {
      toast.error('No content to export');
      return;
    }

    const markdown = `# ${activeNote.title}
**Textbook:** ${currentTextbook?.title || 'Unknown'}
**Date:** ${new Date(activeNote.updated_at).toLocaleDateString()}

---

${activeNote.content}

---

*Exported from AI Textbook Reader*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Note exported as Markdown');
  };

  // Export active note as plain text
  const exportAsText = () => {
    if (!activeNote?.content.trim()) {
      toast.error('No content to export');
      return;
    }

    const text = `${activeNote.title}
Textbook: ${currentTextbook?.title || 'Unknown'}
Date: ${new Date(activeNote.updated_at).toLocaleDateString()}

${activeNote.content}
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNote.title.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Note exported as text file');
  };

  // Print active note (acts as PDF export)
  const printNote = () => {
    if (!activeNote?.content.trim()) {
      toast.error('No content to export');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeNote.title}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
            }
            h1 { color: #333; margin-bottom: 10px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
            .content { white-space: pre-wrap; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${activeNote.title}</h1>
          <div class="meta">
            Textbook: ${currentTextbook?.title || 'Unknown'}<br>
            Date: ${new Date(activeNote.updated_at).toLocaleDateString()}
          </div>
          <div class="content">${activeNote.content}</div>
          <div class="footer">Exported from AI Textbook Reader</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="h-full flex flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-wide uppercase text-muted-foreground">Notes</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-xs text-muted-foreground">
              {saving ? 'Saving...' : 'Synced'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={createNote}
            className="h-7 px-2 text-xs"
            disabled={!currentTextbook}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Note
          </Button>
          
          {activeNote && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Export note"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportAsMarkdown} className="text-xs">
                  <FileDown className="w-3 h-3 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAsText} className="text-xs">
                  <FileDown className="w-3 h-3 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={printNote} className="text-xs">
                  <FileDown className="w-3 h-3 mr-2" />
                  Print / Save as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notes List */}
        {notes.length > 0 && (
          <div className="border-b border-border">
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note.id)}
                    className={`p-2 rounded-md cursor-pointer group transition-colors ${
                      activeNote?.id === note.id
                        ? 'bg-accent border border-accent'
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <h4 className="text-xs font-medium truncate">
                            {note.title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(note.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Note Editor */}
        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !currentTextbook ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Upload a textbook to start taking notes
              </p>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                No notes yet
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={createNote}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create your first note
              </Button>
            </div>
          ) : activeNote ? (
            <Textarea
              value={activeNote.content}
              onChange={(e) => updateNoteContent(e.target.value)}
              className="min-h-full w-full resize-none border-0 p-0 focus-visible:ring-0 font-mono text-xs leading-relaxed"
              placeholder="Start typing your notes... (First line becomes the title)"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a note to edit</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
