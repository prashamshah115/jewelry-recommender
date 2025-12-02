import { useEffect, useMemo, useState, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { DatasetType, SearchFilters } from "../api/types";

interface FilterSidebarProps {
  dataset?: DatasetType;
  onFilterChange?: (filters: SearchFilters) => void;
}

const DIAMOND_SHAPES = ["Round", "Princess", "Cushion", "Oval", "Emerald", "Pear"];
const COLOR_GRADES = ["D", "E", "F", "G", "H", "I", "J", "K"];
const CLARITY_OPTIONS = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2"];
const METAL_TYPES = ["Platinum", "18K White Gold", "18K Yellow Gold", "18K Rose Gold"];
const SETTING_STYLES = ["solitaire", "halo", "hidden halo", "cathedral", "pavé", "vintage", "modern", "classic", "signature"];

export function FilterSidebar({ dataset = "cartier", onFilterChange }: FilterSidebarProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([5000, 50000]);
  const [caratRange, setCaratRange] = useState<[number, number]>([0.5, 3.0]);
  const [selectedShapes, setSelectedShapes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedClarities, setSelectedClarities] = useState<string[]>([]);
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Refs to avoid infinite loops
  const prevFiltersRef = useRef<SearchFilters>({});
  const onFilterChangeRef = useRef(onFilterChange);

  // Keep the callback ref up to date
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  const resetFilters = () => {
    setPriceRange([5000, 50000]);
    setCaratRange([0.5, 3.0]);
    setSelectedShapes([]);
    setSelectedColors([]);
    setSelectedClarities([]);
    setSelectedMetals([]);
    setSelectedStyles([]);
  };

  useEffect(() => {
    resetFilters();
  }, [dataset]);

  useEffect(() => {
    const baseFilters: SearchFilters = {
      price_min: priceRange[0],
      price_max: priceRange[1],
    };

    if (dataset === "cartier") {
      Object.assign(baseFilters, {
        metal: selectedMetals,
        style: selectedStyles,
      });
    } else if (dataset === "personalized") {
      // Personalized needs both diamond and setting filters
      Object.assign(baseFilters, {
        shape: selectedShapes,
        color: selectedColors,
        clarity: selectedClarities,
        carat_min: caratRange[0],
        carat_max: caratRange[1],
        metal: selectedMetals,
        style: selectedStyles,
      });
    } else {
      // Diamonds only
      Object.assign(baseFilters, {
        shape: selectedShapes,
        color: selectedColors,
        clarity: selectedClarities,
        carat_min: caratRange[0],
        carat_max: caratRange[1],
      });
    }

    // Only call onFilterChange if filters have actually changed
    const prevFiltersStr = JSON.stringify(prevFiltersRef.current);
    const newFiltersStr = JSON.stringify(baseFilters);
    
    if (prevFiltersStr !== newFiltersStr) {
      prevFiltersRef.current = baseFilters;
      onFilterChangeRef.current?.(baseFilters);
    }
  }, [
    dataset,
    priceRange,
    caratRange,
    selectedShapes,
    selectedColors,
    selectedClarities,
    selectedMetals,
    selectedStyles,
  ]);

  const isDiamondsDataset = useMemo(() => dataset === "diamonds", [dataset]);
  const isPersonalizedDataset = useMemo(() => dataset === "personalized", [dataset]);

  const toggleValue = (value: string, current: string[], setter: (next: string[]) => void) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  return (
    <Card className="p-6 border-blue-100 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-blue-600" />
          <h3 className="tracking-wide">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-600" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <Label className="text-sm tracking-wide mb-3 block">
            Price Range
          </Label>
          <div className="px-2">
            <Slider
              min={1000}
              max={100000}
              step={1000}
              value={priceRange}
              onValueChange={setPriceRange}
              className="mb-3"
            />
            <div className="flex justify-between text-sm text-slate-600">
              <span>${priceRange[0].toLocaleString()}</span>
              <span>${priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>

        {(isDiamondsDataset || isPersonalizedDataset) && (
          <>
            {/* Carat Weight */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Carat Weight</Label>
              <div className="px-2">
                <Slider
                  min={0.3}
                  max={5.0}
                  step={0.1}
                  value={caratRange}
                  onValueChange={(value) => setCaratRange([value[0], value[1]])}
                  className="mb-3"
                />
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{caratRange[0].toFixed(1)}ct</span>
                  <span>{caratRange[1].toFixed(1)}ct</span>
                </div>
              </div>
            </div>

            {/* Diamond Shape */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Diamond Shape</Label>
              <div className="space-y-2">
                {DIAMOND_SHAPES.map((shape) => (
                  <div key={shape} className="flex items-center space-x-2">
                    <Checkbox
                      id={`shape-${shape}`}
                      checked={selectedShapes.includes(shape)}
                      onCheckedChange={() => toggleValue(shape, selectedShapes, setSelectedShapes)}
                    />
                    <label htmlFor={`shape-${shape}`} className="text-sm cursor-pointer">
                      {shape}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Color Grade</Label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_GRADES.map((color) => {
                  const isSelected = selectedColors.includes(color);
                  return (
                    <Button
                      key={color}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`border-blue-200 ${
                        isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50 hover:border-blue-400"
                      }`}
                      onClick={() => toggleValue(color, selectedColors, setSelectedColors)}
                    >
                      {color}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Clarity */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Clarity</Label>
              <div className="space-y-2">
                {CLARITY_OPTIONS.map((clarity) => (
                  <div key={clarity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`clarity-${clarity}`}
                      checked={selectedClarities.includes(clarity)}
                      onCheckedChange={() => toggleValue(clarity, selectedClarities, setSelectedClarities)}
                    />
                    <label htmlFor={`clarity-${clarity}`} className="text-sm cursor-pointer">
                      {clarity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(isPersonalizedDataset || dataset === "cartier") && (
          <>
            {/* Metal Type */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Metal Type</Label>
              <div className="space-y-2">
                {METAL_TYPES.map((metal) => (
                  <div key={metal} className="flex items-center space-x-2">
                    <Checkbox
                      id={`metal-${metal}`}
                      checked={selectedMetals.includes(metal)}
                      onCheckedChange={() => toggleValue(metal, selectedMetals, setSelectedMetals)}
                    />
                    <label htmlFor={`metal-${metal}`} className="text-sm cursor-pointer">
                      {metal}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Setting Style */}
            <div>
              <Label className="text-sm tracking-wide mb-3 block">Setting Style</Label>
              <div className="space-y-2">
                {SETTING_STYLES.map((style) => (
                  <div key={style} className="flex items-center space-x-2">
                    <Checkbox
                      id={`style-${style}`}
                      checked={selectedStyles.includes(style)}
                      onCheckedChange={() => toggleValue(style, selectedStyles, setSelectedStyles)}
                    />
                    <label htmlFor={`style-${style}`} className="text-sm cursor-pointer">
                      {style}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
