import { useState, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertCircle, Lightbulb, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { useTextbook } from '../../contexts/TextbookContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface PageContent {
  applications: string[];
  questions: Array<{
    question: string;
    answer: string;
    difficulty?: string;
  }>;
}

export function RecallPanel() {
  const { currentTextbook, currentPage, currentPageData } = useTextbook();
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Load existing content for current page
  useEffect(() => {
    const loadPageContent = async () => {
      if (!currentTextbook || !currentPage) return;

      try {
        setLoading(true);
        setError(null);

        // Get page data first
        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('id')
          .eq('textbook_id', currentTextbook.id)
          .eq('page_number', currentPage)
          .maybeSingle();

        if (pageError) {
          console.error('[RecallPanel] Error loading page:', pageError);
          setContent(null);
          return;
        }

        if (!pageData) {
          // Page not extracted yet
          setContent(null);
          return;
        }

        // Get AI content for this page
        const { data: aiContent, error: aiError } = await supabase
          .from('ai_processed_content')
          .select('applications, practice_questions')
          .eq('page_id', pageData.id)
          .maybeSingle();

        if (aiError && aiError.code !== 'PGRST116') {
          console.error('[RecallPanel] Error loading AI content:', aiError);
        }

        if (aiContent && (aiContent.applications || aiContent.practice_questions)) {
          setContent({
            applications: aiContent.applications || [],
            questions: aiContent.practice_questions || [],
          });
        } else {
          setContent(null);
        }
      } catch (error) {
        console.error('[RecallPanel] Error:', error);
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    loadPageContent();
    setRevealedAnswers(new Set()); // Reset revealed answers when page changes
  }, [currentTextbook, currentPage]);

  const handleGenerate = async () => {
    if (!currentTextbook || !currentPage) return;

    try {
      setGenerating(true);
      setError(null);
      
      // Stage 1: Analyzing
      setGenerationStage('Analyzing page text...');
      toast.loading('Analyzing page text...', { id: 'generation' });
      await new Promise(resolve => setTimeout(resolve, 500)); // Visual delay

      // Stage 2: Generating
      setGenerationStage('Generating applications...');
      toast.loading('Generating applications...', { id: 'generation' });

      const response = await fetch('/api/generate-page-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textbookId: currentTextbook.id,
          pageNumber: currentPage,
        }),
      });

      if (!response.ok) {
        toast.dismiss('generation');
        const errorData = await response.json();
        
        if (errorData.code === 'TEXT_NOT_EXTRACTED') {
          setError('Page text is still being extracted. Please wait a moment and try again.');
          toast.error('Page text not ready yet. Try again in a few seconds.');
        } else if (errorData.code === 'INSUFFICIENT_TEXT') {
          setError('This page doesn\'t have enough text to generate content.');
          toast.error('Not enough text on this page.');
        } else {
          throw new Error(errorData.details || errorData.error || 'Failed to generate content');
        }
        return;
      }

      // Stage 3: Finalizing
      setGenerationStage('Creating practice questions...');
      toast.loading('Creating practice questions...', { id: 'generation' });
      await new Promise(resolve => setTimeout(resolve, 300)); // Visual delay

      const data = await response.json();
      
      setContent({
        applications: data.applications || [],
        questions: data.questions || [],
      });

      toast.success('Content generated successfully!', { id: 'generation' });
    } catch (error) {
      toast.dismiss('generation');
      console.error('[RecallPanel] Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to generate content: ${errorMessage}`);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
      setGenerationStage('');
    }
  };

  const toggleAnswer = (index: number) => {
    const newRevealed = new Set(revealedAnswers);
    if (newRevealed.has(index)) {
      newRevealed.delete(index);
    } else {
      newRevealed.add(index);
    }
    setRevealedAnswers(newRevealed);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No content - show generate button
  if (!content) {
    return (
      <div className="px-3 space-y-4">
        <div className="text-center py-8 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
            <Brain className="w-8 h-8 text-accent" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Generate Practice Content</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Get AI-generated real-world applications and practice questions for this page
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-left">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="mx-auto"
            size="sm"
          >
            {generating ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {generationStage}
                </div>
                <span className="text-xs opacity-70">~3-5 seconds</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate for Page {currentPage}
              </>
            )}
          </Button>

          {!currentPageData && !error && (
            <p className="text-xs text-muted-foreground">
              Note: Text extraction for this page is still in progress
            </p>
          )}
        </div>
      </div>
    );
  }

  // Content exists - show it
  return (
    <div className="space-y-4">
      {/* Regenerate button */}
      <div className="flex items-center justify-between px-3">
        <span className="text-xs text-muted-foreground">Page {currentPage}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="h-7 px-2 text-xs"
          title={generating ? generationStage : 'Regenerate content for this page'}
        >
          {generating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {generationStage.split('...')[0]}...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      {/* Applications Section */}
      {content.applications && content.applications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3">
            <Lightbulb className="w-4 h-4 text-accent" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">
              Real-World Applications
            </h4>
          </div>
          
          <div className="space-y-2 px-3">
            {content.applications.map((app, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-accent/5 border border-accent/10 rounded-md"
              >
                <span className="text-xs text-accent font-medium mt-0.5">•</span>
                <p className="text-xs leading-relaxed flex-1">{app}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions Section */}
      {content.questions && content.questions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3">
            <Brain className="w-4 h-4 text-accent" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">
              Practice Questions
            </h4>
          </div>

          <div className="space-y-2 px-3">
            {content.questions.map((q, index) => (
              <div
                key={index}
                className="border border-border rounded-md overflow-hidden hover:border-accent/50 transition-colors"
              >
                <div className="px-3 py-2 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-muted-foreground mt-0.5 font-medium">
                      Q{index + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs leading-relaxed">{q.question}</p>
                      {q.difficulty && (
                        <span className="text-xs text-muted-foreground capitalize inline-flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            q.difficulty === 'easy' ? 'bg-green-500' :
                            q.difficulty === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} />
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {revealedAnswers.has(index) ? (
                  <div className="px-3 py-2 bg-accent/5 border-t border-border">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-accent mt-0.5 font-medium">A:</span>
                      <p className="text-xs leading-relaxed flex-1">{q.answer}</p>
                    </div>
                    <button
                      onClick={() => toggleAnswer(index)}
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <ChevronUp className="w-3 h-3" />
                      Hide answer
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="w-full px-3 py-2 text-xs text-accent hover:bg-accent/5 transition-colors border-t border-border flex items-center justify-center gap-1"
                  >
                    <ChevronDown className="w-3 h-3" />
                    Reveal answer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message if regeneration fails */}
      {error && (
        <div className="flex items-start gap-2 p-3 mx-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
