import { ExternalLink, Loader2 } from 'lucide-react';
import { useTextbook } from '../../contexts/TextbookContext';

export function ApplicationsPanel() {
  const { currentAIContent, loading } = useTextbook();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const applications = currentAIContent?.applications || [];

  if (!applications || applications.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground">
        <p>Applications not available yet.</p>
        <p className="mt-2">The page needs to be processed by AI first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app: any, index) => (
        <div
          key={index}
          className="border border-border rounded-md p-3 hover:border-accent/50 transition-colors"
        >
          <h4 className="text-xs mb-1.5 flex items-center gap-1">
            {typeof app === 'string' ? `Application ${index + 1}` : app.title || `Application ${index + 1}`}
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground mb-2 font-serif">
            {typeof app === 'string' ? app : app.description || app}
          </p>
          {app.relatedTopics && (
            <div className="flex flex-wrap gap-1">
              {app.relatedTopics.map((topic: string) => (
                <span
                  key={topic}
                  className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
