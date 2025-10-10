import { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface Question {
  id: number;
  question: string;
  difficulty: number;
}

interface PracticeQuestionsProps {
  questions: Question[];
}

export function PracticeQuestions({ questions }: PracticeQuestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  const renderDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < difficulty ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleQuestionClick = (questionId: number) => {
    setSelectedQuestion(selectedQuestion === questionId ? null : questionId);
    console.log('Selected question:', questionId);
    // This would trigger AI to provide hints or explanation
  };

  return (
    <Card className="bg-white">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Practice Questions
                </h3>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {questions.map((question) => (
                <div 
                  key={question.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedQuestion === question.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQuestionClick(question.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {question.id}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 mb-2">
                        {question.question}
                      </p>
                      
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500 mr-2">
                          Difficulty:
                        </span>
                        {renderDifficultyStars(question.difficulty)}
                      </div>
                    </div>
                  </div>
                  
                  {selectedQuestion === question.id && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        💡 Hint: Think about the key differences in how each learning type uses data and feedback.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}