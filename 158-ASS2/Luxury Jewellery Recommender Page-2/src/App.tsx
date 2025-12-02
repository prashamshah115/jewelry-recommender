import { useCallback, useState } from "react";
import { Header } from "./components/Header";
import { AIStylerInput } from "./components/AIStylerInput";
import { RingCard } from "./components/RingCard";
import { FilterSidebar } from "./components/FilterSidebar";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Toaster, toast } from "sonner";
import { searchJewelry } from "./api/client";
import { SearchFilters } from "./api/types";
import { mapResultsToRecommendations, RecommendationDisplay } from "./utils/dataMapper";

interface LastQueryState {
  description: string;
  imageFile?: File | null;
}

const DATASET = "personalized" as const;

export default function App() {
  const [recommendations, setRecommendations] = useState<RecommendationDisplay[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [lastQuery, setLastQuery] = useState<LastQueryState | null>(null);

  const runSearch = useCallback(
    async (description?: string, imageFile?: File | null) => {
      if (!description && !imageFile) {
        setErrorMessage("Please describe your dream ring to get personalized recommendations.");
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await searchJewelry({
          queryText: description,
          imageFile,
          dataset: DATASET,
          filters,
          topK: 12,
        });

        const mappedResults = mapResultsToRecommendations(DATASET, response.results);
        setRecommendations(mappedResults);
        setHasSearched(true);
        setLastQuery({ description: description ?? "", imageFile });
        toast.success("Recommendations updated");
      } catch (error) {
        const message =
          (error as { message?: string })?.message ?? "Something went wrong. Please try again.";
        setErrorMessage(message);
        setRecommendations([]);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [filters],
  );

  const handleAISubmit = (description: string, image?: File) => {
    void runSearch(description, image);
  };

  const handleFilterChange = useCallback(
    (updatedFilters: SearchFilters) => {
      setFilters(updatedFilters);
      if (hasSearched && lastQuery) {
        void runSearch(lastQuery.description, lastQuery.imageFile ?? undefined);
      }
    },
    [hasSearched, lastQuery, runSearch]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/20 to-white">
      <Toaster position="top-center" />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* AI Stylist Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <AIStylerInput onSubmit={handleAISubmit} />
          {errorMessage && (
            <p className="mt-4 text-sm text-red-600 text-center" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters */}
            <div className="lg:col-span-1">
              <FilterSidebar dataset={DATASET} onFilterChange={handleFilterChange} />
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl tracking-wide mb-1">Your Recommendations</h2>
                  <p className="text-sm text-slate-600">
                    {isLoading
                      ? "Collecting personalized matches..."
                      : `${recommendations.length} rings matched to your preferences`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">Sort by:</span>
                  <Select defaultValue="match">
                    <SelectTrigger className="w-[180px] border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Best Match</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                      <SelectItem value="carat">Carat Weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Finding your perfect matches...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.map((rec) => (
                    <RingCard
                      key={rec.id}
                      diamond={rec.diamond}
                      setting={rec.setting}
                      matchScore={rec.matchScore}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && !isLoading && (
          <div className="max-w-4xl mx-auto mt-16 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl mb-3 tracking-wide">Discover Your Perfect Ring</h3>
            <p className="text-slate-600 max-w-xl mx-auto leading-relaxed">
              Our AI Stylist uses advanced machine learning to understand your unique preferences and recommend the perfect diamond and setting combinations. 
              Simply describe your dream ring in detail to get started.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-100 mt-20 bg-gradient-to-b from-white to-blue-50/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="tracking-wider mb-4 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                STYLESTREAM
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                AI-powered luxury jewelry recommendations
              </p>
            </div>
            <div>
              <h5 className="text-sm tracking-wide mb-3">Shop</h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Engagement Rings</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Wedding Bands</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Fine Jewelry</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm tracking-wide mb-3">Education</h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Diamond Guide</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Ring Settings</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Metal Types</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-sm tracking-wide mb-3">Customer Care</h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Warranty</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-100 pt-6 text-center text-sm text-slate-500">
            © 2025 StyleStream. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
