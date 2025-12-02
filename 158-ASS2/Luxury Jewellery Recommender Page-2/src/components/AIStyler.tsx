import { useState } from "react";
import { Sparkles, Upload, Wand2 } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface AIStylerProps {
  onSearch: (query: string) => void;
  onImageUpload: (image: string | null) => void;
}

export function AIStyler({ onSearch, onImageUpload }: AIStylerProps) {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      onSearch(input);
      setIsProcessing(false);
    }, 1000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
        onSearch("image-based-search");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section className="mb-12">
      {/* Hero Section */}
      <div className="text-center mb-8 py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl border border-blue-100">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h2 className="text-blue-900">AI Stylist</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto px-4">
          Describe your dream ring or upload inspiration images, and our AI will curate personalized recommendations from our luxury collection
        </p>
      </div>

      {/* Input Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden">
          <div className="p-6">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your perfect ring... (e.g., 'I want a vintage-inspired oval diamond with a rose gold band and delicate pavé details')"
              className="min-h-[120px] border-none resize-none text-gray-700 placeholder:text-gray-400 focus-visible:ring-0"
            />
          </div>
          
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-t border-blue-100">
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="image-upload">
                <Button variant="outline" className="cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-50" asChild>
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </span>
                </Button>
              </label>
              <span className="text-gray-500 text-sm">or describe in words</span>
            </div>
            
            <Button 
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 shadow-lg shadow-blue-200"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 animate-pulse" />
                  Styling...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Get Recommendations
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Quick Prompts */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          <span className="text-gray-500 text-sm mr-2">Try:</span>
          {[
            "Vintage oval rose gold",
            "Modern emerald cut platinum",
            "Classic round brilliant solitaire",
            "Art deco sapphire halo"
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="px-4 py-2 text-sm bg-white border border-blue-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors text-blue-700"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
