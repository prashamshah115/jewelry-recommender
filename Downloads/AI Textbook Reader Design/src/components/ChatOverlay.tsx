import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  quickActions?: string[];
}

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentSection: string;
}

export function ChatOverlay({ isOpen, onClose, currentSection }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Hi! I'm here to help you understand "${currentSection}". You can ask me to explain concepts, provide examples, or clarify anything you're reading about.`,
      timestamp: new Date(),
      quickActions: ['Explain supervised learning', 'Show examples', 'What are applications?']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date(),
        quickActions: ['Explain further', 'Show example', 'Related concepts']
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    // Simple mock AI responses based on keywords
    const input = userInput.toLowerCase();
    
    if (input.includes('supervised')) {
      return "Supervised learning uses labeled training data where both inputs and correct outputs are provided. The algorithm learns to map inputs to outputs by finding patterns. Common examples include email classification (spam/not spam) and image recognition.";
    } else if (input.includes('unsupervised')) {
      return "Unsupervised learning works with unlabeled data to find hidden patterns or structures. The algorithm doesn't know the 'correct' answer and must discover relationships on its own. Examples include customer segmentation and anomaly detection.";
    } else if (input.includes('reinforcement')) {
      return "Reinforcement learning involves an agent learning through trial and error by interacting with an environment. It receives rewards or penalties for actions and learns to maximize total reward over time. Think of how a game AI learns to play chess.";
    } else {
      return "That's a great question! Machine learning is all about finding patterns in data to make predictions or decisions. Each type of learning (supervised, unsupervised, reinforcement) tackles different kinds of problems. What specific aspect would you like me to elaborate on?";
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    handleSendMessage();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-20 backdrop-blur-sm">
      <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-white rounded-t-xl shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h2 className="font-medium text-gray-900">
              Ask about this section
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 h-[calc(60vh-120px)] p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
                
                {message.quickActions && (
                  <div className="flex justify-start">
                    <div className="flex flex-wrap gap-2 max-w-[80%]">
                      {message.quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleQuickAction(action)}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about machine learning..."
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}