import { useState } from 'react';
import { SummaryCard } from './ai-components/SummaryCard';
import { KeyConceptsList } from './ai-components/KeyConceptsList';
import { ApplicationsPanel } from './ai-components/ApplicationsPanel';
import { PracticeQuestions } from './ai-components/PracticeQuestions';
import { PersonalNotes } from './ai-components/PersonalNotes';
import { mockAIContent } from './mock-data';

interface AIPaneProps {
  selectedText: string;
}

export function AIPane({ selectedText }: AIPaneProps) {
  const [notes, setNotes] = useState<Array<{ id: string; content: string; timestamp: Date }>>([]);

  const handleAddNote = (content: string) => {
    const newNote = {
      id: Date.now().toString(),
      content,
      timestamp: new Date()
    };
    setNotes(prev => [newNote, ...prev]);
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="p-6 space-y-4">
        {/* Quick Summary */}
        <SummaryCard 
          summary={mockAIContent.summary}
          isLoading={false}
        />

        {/* Key Concepts */}
        <KeyConceptsList 
          concepts={mockAIContent.keyConcepts}
          selectedText={selectedText}
        />

        {/* Applications Panel */}
        <ApplicationsPanel 
          applications={mockAIContent.applications}
        />

        {/* Practice Questions */}
        <PracticeQuestions 
          questions={mockAIContent.practiceQuestions}
        />

        {/* Personal Notes */}
        <PersonalNotes 
          notes={notes}
          onAddNote={handleAddNote}
        />
      </div>
    </div>
  );
}