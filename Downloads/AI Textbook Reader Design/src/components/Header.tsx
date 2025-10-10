import { Settings, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface HeaderProps {
  currentSection: string;
  readingProgress: number;
  onChatToggle: () => void;
  chatOpen: boolean;
}

export function Header({ currentSection, readingProgress, onChatToggle, chatOpen }: HeaderProps) {
  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left Section - Logo & Navigation */}
      <div className="flex items-center space-x-6">
        <div className="font-semibold text-gray-900 text-lg">
          TextbookAI
        </div>
        <nav className="text-sm text-gray-500">
          <span>Machine Learning Fundamentals</span>
          <span className="mx-2">›</span>
          <span>Chapter 1</span>
          <span className="mx-2">›</span>
          <span>Introduction</span>
        </nav>
      </div>

      {/* Center Section - Current Section */}
      <div className="flex-1 text-center">
        <h1 className="text-base font-medium text-gray-700 max-w-md mx-auto truncate">
          {currentSection}
        </h1>
      </div>

      {/* Right Section - Progress & Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-24">
            <Progress value={readingProgress} className="h-3" />
          </div>
          <span className="text-sm text-gray-500 min-w-[3rem]">
            {readingProgress}%
          </span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={() => window.location.reload()}
          title="Refresh app if it becomes unresponsive"
        >
          <RefreshCw className="h-5 w-5 text-gray-500" />
        </Button>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-5 w-5 text-gray-500" />
        </Button>
        
        <Button 
          onClick={onChatToggle}
          className={`h-8 px-4 text-sm ${
            chatOpen 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat
        </Button>
      </div>
    </header>
  );
}