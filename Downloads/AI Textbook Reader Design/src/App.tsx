import { useState, useEffect, useRef } from 'react';
import { MinimalHeader } from './components/MinimalHeader';
import { NotesPanel } from './components/NotesPanel';
import { PDFReader } from './components/PDFReader';
import { MinimalAIPane } from './components/MinimalAIPane';
import { ExplainTooltip } from './components/ExplainTooltip';
import { UploadProgressBanner } from './components/UploadProgressBanner';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useTextbook } from './contexts/TextbookContext';
import { useNotes } from './contexts/NotesContext';

function AppContent() {
  const [tooltipData, setTooltipData] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const { nextPage, prevPage } = useTextbook();
  const { activeNote, updateNoteContent } = useNotes();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // j/k for page navigation
      if (e.key === 'j' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'k' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Focus notes
        notesRef.current?.querySelector('textarea')?.focus();
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Regenerate right panel
        console.log('Regenerate AI panel');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage]);

  const handleTextSelect = (text: string, position: { x: number; y: number }) => {
    setTooltipData({ text, position });
  };

  const handleCloseTooltip = () => {
    setTooltipData(null);
  };

  const handleAddToNotes = () => {
    if (tooltipData?.text && activeNote) {
      const newContent = activeNote.content
        ? `${activeNote.content}\n\n${tooltipData.text}`
        : tooltipData.text;
      updateNoteContent(newContent);
    }
    setTooltipData(null);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <MinimalHeader />
      <UploadProgressBanner />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Notes Panel (Sticky) */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div ref={notesRef}>
              <NotesPanel />
            </div>
          </ResizablePanel>
          
          <ResizableHandle className="w-px bg-border hover:bg-accent transition-colors" />
          
          {/* Center: PDF Reader */}
          <ResizablePanel defaultSize={50} minSize={35}>
            <PDFReader onTextSelect={handleTextSelect} />
          </ResizablePanel>
          
          <ResizableHandle className="w-px bg-border hover:bg-accent transition-colors" />
          
          {/* Right: AI Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <MinimalAIPane />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Explain Tooltip */}
      {tooltipData && (
        <ExplainTooltip
          text={tooltipData.text}
          position={tooltipData.position}
          onClose={handleCloseTooltip}
          onAddToNotes={handleAddToNotes}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProtectedRoute>
      <AppContent />
    </ProtectedRoute>
  );
}
