import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface SummaryCardProps {
  summary: string;
  isLoading: boolean;
}

export function SummaryCard({ summary, isLoading }: SummaryCardProps) {
  const handleRegenerate = () => {
    console.log('Regenerating summary...');
    // This would trigger a new AI summary generation
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Summary
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-blue-600 hover:text-blue-700"
            onClick={handleRegenerate}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Regenerate
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-gray-700 leading-relaxed">
            {summary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}