import { useState } from 'react';
import { Plus, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface Note {
  id: string;
  content: string;
  timestamp: Date;
}

interface PersonalNotesProps {
  notes: Note[];
  onAddNote: (content: string) => void;
}

export function PersonalNotes({ notes, onAddNote }: PersonalNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  const handleSaveNote = () => {
    if (noteContent.trim()) {
      onAddNote(noteContent.trim());
      setNoteContent('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNoteContent('');
    setIsAdding(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StickyNote className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              My Notes
            </h3>
          </div>
          {!isAdding && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-600 hover:text-green-700"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isAdding && (
          <div className="mb-4 p-3 border border-gray-200 rounded-md">
            <Textarea
              placeholder="Add your thoughts..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="mb-3 resize-none border-0 p-0 text-sm"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={!noteContent.trim()}
                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
              >
                Save
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !isAdding ? (
          <div className="text-center py-6">
            <StickyNote className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notes yet</p>
            <p className="text-xs text-gray-400">
              Add your thoughts and insights as you read
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div 
                key={note.id}
                className="p-3 bg-yellow-50 border border-yellow-200 rounded-md"
              >
                <p className="text-sm text-gray-800 mb-2 leading-relaxed">
                  {note.content}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(note.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}