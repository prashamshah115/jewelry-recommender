import { useState, useEffect } from 'react';
import { RotateCw, Loader2, Brain } from 'lucide-react';
import { Button } from '../ui/button';
import { useTextbook } from '../../contexts/TextbookContext';
import { supabase } from '../../lib/supabase';

interface RecallQuestion {
  id: string;
  question: string;
  answer: string;
  difficulty: string;
  order_index: number;
}

export function RecallPanel() {
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const { currentTextbook, currentPage } = useTextbook();
  const [questions, setQuestions] = useState<RecallQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecallQuestions = async () => {
      if (!currentTextbook || !currentPage) return;

      try {
        setLoading(true);

        // Find which chapter the current page belongs to
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('id')
          .eq('textbook_id', currentTextbook.id)
          .lte('page_start', currentPage)
          .gte('page_end', currentPage)
          .single();

        if (chapterError && chapterError.code !== 'PGRST116') {
          console.error('[RecallPanel] Error loading chapter:', chapterError);
          return;
        }

        if (chapter) {
          // Load recall questions for this chapter
          const { data: questionsData, error: questionsError } = await supabase
            .from('recall_questions')
            .select('*')
            .eq('chapter_id', chapter.id)
            .order('order_index');

          if (questionsError) {
            console.error('[RecallPanel] Error loading questions:', questionsError);
            return;
          }

          setQuestions(questionsData || []);
        }
      } catch (error) {
        console.error('[RecallPanel] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecallQuestions();
  }, [currentTextbook, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleAnswer = (index: number) => {
    const newRevealed = new Set(revealedAnswers);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedAnswers(newRevealed);
  };

  const handleRegenerate = () => {
    setRevealedAnswers(new Set());
    // In a real app, this would trigger new question generation
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4" />
          <p className="font-medium">Recall questions not available yet</p>
        </div>
        <p>AI is still generating practice questions for this chapter. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-3">
        <span className="text-xs text-muted-foreground">{questions.length} questions</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          className="h-7 px-2 text-xs"
        >
          <RotateCw className="w-3 h-3 mr-1" />
          Regenerate
        </Button>
      </div>

      <div className="space-y-2">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="border border-border rounded-md overflow-hidden hover:border-accent/50 transition-colors"
          >
            <div className="px-3 py-2 bg-muted/50">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-muted-foreground mt-0.5">Q{index + 1}</span>
                <div className="flex-1">
                  <p className="text-xs leading-relaxed">{q.question}</p>
                  {q.difficulty && (
                    <span className="text-xs text-muted-foreground mt-1 inline-block capitalize">
                      {q.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {revealedAnswers.has(index) ? (
              <div className="px-3 py-2 bg-accent/5 border-t border-border">
                <p className="text-xs leading-relaxed">{q.answer}</p>
              </div>
            ) : (
              <button
                onClick={() => toggleAnswer(index)}
                className="w-full px-3 py-2 text-xs text-accent hover:bg-accent/5 transition-colors border-t border-border"
              >
                Reveal answer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
