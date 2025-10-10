import { Search, User, LogOut, Upload, Trash2, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from './ui/select';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTextbook } from '../contexts/TextbookContext';
import { UploadDialog } from './UploadDialog';
import type { UploadMetadata } from './UploadDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

interface SearchResult {
  page_number: number;
  snippet: string;
  type: 'textbook' | 'note';
}

export function MinimalHeader() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [textbookToDelete, setTextbookToDelete] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { textbooks, currentTextbook, loadTextbook, uploadTextbook, setCurrentPage, loadTextbooks } = useTextbook();

  const handleUpload = async (file: File, metadata: UploadMetadata) => {
    await uploadTextbook(file, metadata);
  };

  const handleDeleteClick = (textbookId: string) => {
    setTextbookToDelete(textbookId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!textbookToDelete) return;

    try {
      // Delete textbook (cascade will delete associated data)
      const { error } = await supabase
        .from('textbooks')
        .delete()
        .eq('id', textbookToDelete);

      if (error) throw error;

      toast.success('Textbook deleted successfully');
      await loadTextbooks();
      
      // If deleted textbook was current, clear it
      if (currentTextbook?.id === textbookToDelete) {
        // Load first available textbook or none
        if (textbooks.length > 1) {
          const nextTextbook = textbooks.find(t => t.id !== textbookToDelete);
          if (nextTextbook) {
            await loadTextbook(nextTextbook.id);
          }
        }
      }
    } catch (error) {
      console.error('[Delete] Error:', error);
      toast.error('Failed to delete textbook');
    } finally {
      setDeleteDialogOpen(false);
      setTextbookToDelete(null);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || !currentTextbook) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      // Search in textbook pages
      const { data: pageResults, error: pageError } = await supabase
        .from('pages')
        .select('page_number, raw_text')
        .eq('textbook_id', currentTextbook.id)
        .ilike('raw_text', `%${query}%`)
        .limit(10);

      if (pageError) throw pageError;

      // Search in notes
      const { data: noteResults, error: noteError } = await supabase
        .from('user_notes')
        .select('page_number, content')
        .eq('textbook_id', currentTextbook.id)
        .eq('user_id', user?.id)
        .ilike('content', `%${query}%`)
        .limit(5);

      if (noteError) throw noteError;

      const results: SearchResult[] = [
        ...(pageResults || []).map(p => ({
          page_number: p.page_number,
          snippet: p.raw_text.substring(
            Math.max(0, p.raw_text.toLowerCase().indexOf(query.toLowerCase()) - 50),
            p.raw_text.toLowerCase().indexOf(query.toLowerCase()) + query.length + 50
          ),
          type: 'textbook' as const
        })),
        ...(noteResults || []).map(n => ({
          page_number: n.page_number || 0,
          snippet: n.content.substring(0, 100),
          type: 'note' as const
        }))
      ];

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('[Search] Error:', error);
      toast.error('Search failed');
    }
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-4">
      <Select 
        value={currentTextbook?.id || ''} 
        onValueChange={(value) => {
          if (value === 'upload') {
            setUploadDialogOpen(true);
          } else {
            loadTextbook(value);
          }
        }}
      >
        <SelectTrigger className="w-[220px] h-8 text-xs border-border">
          <SelectValue placeholder="Select textbook" />
        </SelectTrigger>
        <SelectContent>
          {textbooks.length === 0 ? (
            <SelectItem value="none" disabled>
              No textbooks yet
            </SelectItem>
          ) : (
            textbooks.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.title}
              </SelectItem>
            ))
          )}
          <SelectSeparator />
          <SelectItem value="upload">
            <div className="flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload New Textbook</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search in book and notes..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
          className="w-full h-8 pl-8 pr-3 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-y-auto z-50">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(result.page_number)}
                className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">Page {result.page_number}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                    {result.type === 'textbook' ? 'Textbook' : 'Note'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  ...{result.snippet}...
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Textbook Management */}
      {currentTextbook && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">
              Manage Textbook
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteClick(currentTextbook.id)} 
              className="text-xs text-red-600"
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete Textbook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 hover:bg-muted rounded-full transition-colors ml-auto">
            <User className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-xs">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-xs">
            <LogOut className="w-3 h-3 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUpload}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Textbook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this textbook along with all your notes, highlights, and AI-generated content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
