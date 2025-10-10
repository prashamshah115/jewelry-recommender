import { useState, useRef, useEffect } from 'react';
import { Hash } from 'lucide-react';
import { SelectionToolbar } from './SelectionToolbar';
import { mockTextbookContent } from './mock-data';

interface TextbookPaneProps {
  onTextSelection: (text: string) => void;
  selectedText: string;
  onProgressUpdate: (progress: number) => void;
}

export function TextbookPane({ onTextSelection, selectedText, onProgressUpdate }: TextbookPaneProps) {
  const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      onTextSelection(text);
      setShowToolbar(true);
      setToolbarPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setShowToolbar(false);
      onTextSelection('');
    }
  };

  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      onProgressUpdate(Math.min(100, Math.max(0, progress)));
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
    };
  }, []);

  return (
    <div className="h-full bg-white relative">
      <div 
        ref={contentRef}
        className="h-full overflow-y-auto px-8 py-10 max-w-none"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl">
          {/* Reading Progress Line */}
          <div className="absolute left-2 top-0 w-0.5 bg-gray-200 h-full">
            <div 
              className="w-full bg-blue-500 transition-all duration-300"
              style={{ height: `35%` }}
            />
          </div>

          {/* Chapter Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Chapter 1: Introduction to Machine Learning
            </h1>
          </div>

          {/* Content Sections */}
          {mockTextbookContent.map((section, sectionIndex) => (
            <section key={sectionIndex} className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {section.title}
              </h2>
              
              {section.content.map((paragraph, paragraphIndex) => {
                const globalIndex = sectionIndex * 10 + paragraphIndex;
                
                if (paragraph.type === 'text') {
                  return (
                    <div
                      key={paragraphIndex}
                      className={`relative group mb-4 transition-colors duration-200 ${
                        hoveredParagraph === globalIndex ? 'bg-gray-50' : ''
                      }`}
                      onMouseEnter={() => setHoveredParagraph(globalIndex)}
                      onMouseLeave={() => setHoveredParagraph(null)}
                    >
                      <p className="text-base text-gray-700 leading-relaxed px-4 py-2 rounded">
                        {paragraph.content}
                      </p>
                      
                      {/* Paragraph number on hover */}
                      <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Hash className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  );
                } else if (paragraph.type === 'code') {
                  return (
                    <div key={paragraphIndex} className="mb-6">
                      <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                        <code className="text-sm font-mono text-gray-800">
                          {paragraph.content}
                        </code>
                      </pre>
                    </div>
                  );
                } else if (paragraph.type === 'subsection') {
                  return (
                    <h3 key={paragraphIndex} className="text-xl font-medium text-gray-800 mb-3 mt-6">
                      {paragraph.content}
                    </h3>
                  );
                }
                
                return null;
              })}
            </section>
          ))}
        </div>
      </div>

      {/* Selection Toolbar */}
      {showToolbar && selectedText && (
        <SelectionToolbar 
          position={toolbarPosition}
          selectedText={selectedText}
          onClose={() => {
            setShowToolbar(false);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </div>
  );
}