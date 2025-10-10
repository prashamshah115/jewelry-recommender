import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SummaryPanel } from './ai-panels/SummaryPanel';
import { RecallPanel } from './ai-panels/RecallPanel';
import { ChatPanel } from './ai-panels/ChatPanel';

export function MinimalAIPane() {
  const handleHeadingClick = (sectionId: string) => {
    // In a real app, this would scroll to the relevant paragraph in the PDF
    console.log('Scroll to section:', sectionId);
  };

  return (
    <div className="h-full flex flex-col border-l border-border bg-card">
      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-10 p-0 gap-0">
          <TabsTrigger
            value="summary"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-xs h-10"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="recall"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-xs h-10"
          >
            Recall
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-xs h-10"
          >
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="flex-1 overflow-auto py-3 mt-0">
          <SummaryPanel onHeadingClick={handleHeadingClick} />
        </TabsContent>

        <TabsContent value="recall" className="flex-1 overflow-auto py-3 mt-0">
          <RecallPanel />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
          <ChatPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
