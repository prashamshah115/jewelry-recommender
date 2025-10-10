import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';

interface KeyConceptsListProps {
  concepts: string[];
  selectedText: string;
}

export function KeyConceptsList({ concepts, selectedText }: KeyConceptsListProps) {
  const [activeConcept, setActiveConcept] = useState<string | null>(null);

  const handleConceptClick = (concept: string) => {
    setActiveConcept(concept === activeConcept ? null : concept);
    console.log('Exploring concept:', concept);
    // This would trigger detailed explanation of the concept
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Key Concepts
        </h3>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {concepts.map((concept, index) => (
            <li 
              key={index}
              className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                activeConcept === concept 
                  ? 'bg-blue-50 border-l-3 border-l-blue-500' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleConceptClick(concept)}
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1">
                {concept}
              </span>
            </li>
          ))}
        </ul>
        
        {selectedText && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border-l-3 border-l-blue-500">
            <p className="text-xs text-blue-700 mb-1 font-medium">
              Related to your selection:
            </p>
            <p className="text-sm text-blue-800 truncate">
              "{selectedText.substring(0, 60)}..."
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}