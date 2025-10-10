import { useTextbook } from '../../contexts/TextbookContext';
import { useEffect, useState } from 'react';
import { Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SummaryPanelProps {
  onHeadingClick: (sectionId: string) => void;
}

interface ChapterSummary {
  chapter_number: number;
  title: string;
  summary_text: string;
  key_concepts: string[];
}

export function SummaryPanel({ onHeadingClick }: SummaryPanelProps) {
  const { currentTextbook, currentPage } = useTextbook();
  const [currentChapter, setCurrentChapter] = useState<any>(null);
  const [summary, setSummary] = useState<ChapterSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChapterSummary = async () => {
      if (!currentTextbook || !currentPage) return;

      try {
        setLoading(true);

        // Find which chapter the current page belongs to
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('*, chapter_summaries(*)')
          .eq('textbook_id', currentTextbook.id)
          .lte('page_start', currentPage)
          .gte('page_end', currentPage)
          .single();

        if (chapterError && chapterError.code !== 'PGRST116') {
          console.error('[SummaryPanel] Error loading chapter:', chapterError);
          return;
        }

        if (chapter) {
          setCurrentChapter(chapter);
          const summaryData = chapter.chapter_summaries?.[0];
          if (summaryData) {
            setSummary({
              chapter_number: chapter.chapter_number,
              title: chapter.title,
              summary_text: summaryData.summary_text,
              key_concepts: summaryData.key_concepts || [],
            });
          } else {
            setSummary(null);
          }
        }
      } catch (error) {
        console.error('[SummaryPanel] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChapterSummary();
  }, [currentTextbook, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <p className="font-medium">Summary not available yet</p>
        </div>
        <p>AI analysis is still being generated for this chapter. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="px-3 space-y-4">
      {/* Chapter Header */}
      <div className="pb-2 border-b border-border">
        <div className="text-xs font-medium text-muted-foreground">
          Chapter {summary.chapter_number}
        </div>
        <h3 className="text-sm font-semibold mt-1">{summary.title}</h3>
      </div>

      {/* Summary Text */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Summary
        </h4>
        <p className="text-xs leading-relaxed text-foreground/90">
          {summary.summary_text}
        </p>
      </div>

      {/* Key Concepts */}
      {summary.key_concepts && summary.key_concepts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Key Concepts
          </h4>
          <ul className="space-y-2">
            {summary.key_concepts.map((concept, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-xs text-accent mt-0.5">•</span>
                <span className="text-xs leading-relaxed">{concept}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
