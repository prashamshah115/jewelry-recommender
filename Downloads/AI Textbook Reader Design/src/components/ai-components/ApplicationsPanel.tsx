import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface Application {
  title: string;
  description: string;
}

interface ApplicationsPanelProps {
  applications: Application[];
}

export function ApplicationsPanel({ applications }: ApplicationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="bg-white">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Real-World Applications
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
            <div className="space-y-4">
              {applications.map((app, index) => (
                <div 
                  key={index}
                  className="p-3 border border-gray-200 rounded-md hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {app.title}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {app.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}