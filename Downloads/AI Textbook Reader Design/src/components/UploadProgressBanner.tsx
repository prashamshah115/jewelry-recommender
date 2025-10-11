import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTextbook } from '../contexts/TextbookContext';
import { Progress } from './ui/progress';
import { toast } from 'sonner';

export function UploadProgressBanner() {
  const { currentTextbook } = useTextbook();
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!currentTextbook) {
      setShowBanner(false);
      return;
    }

    // Check if currently processing
    if (currentTextbook.processing_status === 'processing' || 
        currentTextbook.processing_status === 'pending') {
      setShowBanner(true);
      setProcessingStatus(currentTextbook.processing_status);
      setProgress(currentTextbook.processing_progress || 0);

      // Poll for updates
      const pollInterval = setInterval(async () => {
        const { data: textbook } = await supabase
          .from('textbooks')
          .select('processing_status, processing_progress, total_pages')
          .eq('id', currentTextbook.id)
          .single();

        if (textbook) {
          setProcessingStatus(textbook.processing_status);
          setProgress(textbook.processing_progress || 0);

          if (textbook.processing_status === 'completed') {
            clearInterval(pollInterval);
            toast.success(`Text extraction complete! ${textbook.total_pages} pages ready.`);
            setTimeout(() => setShowBanner(false), 5000);
          } else if (textbook.processing_status === 'failed') {
            clearInterval(pollInterval);
            setTimeout(() => setShowBanner(false), 3000);
          }
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    } else if (currentTextbook.processing_status === 'completed') {
      // Don't show banner for completed textbooks
      setShowBanner(false);
    }
  }, [currentTextbook]);

  if (!showBanner) return null;

  const getStatusInfo = () => {
    switch (processingStatus) {
      case 'pending':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
          title: 'PDF ready - You can start reading!',
          subtitle: 'Background processing will start shortly...',
          bgColor: 'bg-blue-50 border-blue-200',
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
          title: 'Background processing in progress',
          subtitle: `Extracting text: ${progress}% complete`,
          bgColor: 'bg-blue-50 border-blue-200',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
          title: '✨ AI features are now ready!',
          subtitle: 'All pages extracted successfully',
          bgColor: 'bg-green-50 border-green-200',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-4 h-4 text-yellow-500" />,
          title: 'Background extraction failed',
          subtitle: 'AI features will use on-demand extraction instead',
          bgColor: 'bg-yellow-50 border-yellow-200',
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <div className={`border-b ${statusInfo.bgColor} px-4 py-3`}>
      <div className="flex items-center gap-3 max-w-screen-xl mx-auto">
        {statusInfo.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">{statusInfo.title}</p>
            {processingStatus === 'processing' && (
              <span className="text-xs text-blue-600 font-medium">{progress}%</span>
            )}
          </div>
          <p className="text-xs text-gray-600">{statusInfo.subtitle}</p>
          {processingStatus === 'processing' && progress > 0 && (
            <Progress value={progress} className="mt-2 h-1.5" />
          )}
        </div>
        {processingStatus === 'pending' && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Sparkles className="w-3 h-3" />
            <span>You can read now</span>
          </div>
        )}
      </div>
    </div>
  );
}

