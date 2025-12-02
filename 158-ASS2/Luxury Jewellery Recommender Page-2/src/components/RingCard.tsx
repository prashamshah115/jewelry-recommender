import { Plus, Heart, Eye } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { DiamondDisplay, SettingDisplay } from "../utils/dataMapper";

interface RingCardProps {
  diamond?: DiamondDisplay | null;
  setting?: SettingDisplay | null;
  matchScore?: number;
}

const DEFAULT_DIAMOND: DiamondDisplay = {
  carat: 1,
  cut: "Signature Cut",
  color: "G",
  clarity: "VS1",
  price: 0,
  image:
    "https://images.unsplash.com/photo-1518544801958-efcbf8a7ec10?auto=format&fit=crop&w=600&q=80",
  shape: "Round",
};

const DEFAULT_SETTING: SettingDisplay = {
  metal: "Platinum",
  style: "Signature Solitaire",
  price: 0,
  image:
    "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80",
  name: "Curated Setting",
};

export function RingCard({ diamond, setting, matchScore }: RingCardProps) {
  const safeDiamond = diamond ?? DEFAULT_DIAMOND;
  const safeSetting = setting ?? DEFAULT_SETTING;
  const totalPrice = (safeDiamond.price ?? 0) + (safeSetting.price ?? 0);

  return (
    <Card className="group overflow-hidden border-blue-100 hover:border-blue-300 transition-all hover:shadow-2xl">
      {matchScore !== undefined && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 text-sm text-center">
          <span className="tracking-wide">{matchScore}% AI Match</span>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 items-center mb-6">
          {/* Diamond - Text Only */}
          <div className="relative">
            <div className="aspect-square rounded-lg bg-gradient-to-br from-slate-50 to-blue-50 p-4 border border-blue-100 flex flex-col justify-center items-center">
              <div className="text-center">
                <Badge className="bg-blue-600 text-xs mb-2">
                  {safeDiamond.carat}ct
                </Badge>
                <p className="text-sm font-medium text-slate-800">
                  {safeDiamond.shape}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {safeDiamond.color} • {safeDiamond.clarity}
                </p>
              </div>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Setting */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 p-4 border border-blue-100">
              <ImageWithFallback
                src={safeSetting.image}
                alt={safeSetting.name}
                className="w-full h-full object-contain"
              />
            </div>
            <Badge className="absolute -top-2 -right-2 bg-slate-600 text-xs">
              {safeSetting.metal}
            </Badge>
          </div>
        </div>

        {/* Diamond Details */}
        <div className="space-y-3 mb-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 tracking-wide uppercase mb-1">Diamond</p>
            <p className="text-sm">
              {safeDiamond.cut}
            </p>
            <div className="flex gap-3 text-xs text-slate-600 mt-1">
              <span>{safeDiamond.color} Color</span>
              <span>•</span>
              <span>{safeDiamond.clarity}</span>
            </div>
          </div>

          {/* Setting Details */}
          <div>
            <p className="text-xs text-slate-500 tracking-wide uppercase mb-1">Setting</p>
            <p className="text-sm">{safeSetting.name}</p>
            <p className="text-xs text-slate-600 mt-1">{safeSetting.style}</p>
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 tracking-wide">Total Price</p>
            <p className="text-xl tracking-tight">${totalPrice.toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="border-blue-200 hover:bg-blue-50">
              <Heart className="w-4 h-4" />
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
              <Eye className="w-4 h-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
