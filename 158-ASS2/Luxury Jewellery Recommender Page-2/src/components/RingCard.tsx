import { Plus, Heart, Eye } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface RingCardProps {
  diamond: {
    carat: number;
    cut: string;
    color: string;
    clarity: string;
    price: number;
    image: string;
    shape: string;
  };
  setting: {
    metal: string;
    style: string;
    price: number;
    image: string;
    name: string;
  };
  matchScore?: number;
}

export function RingCard({ diamond, setting, matchScore }: RingCardProps) {
  const totalPrice = diamond.price + setting.price;

  return (
    <Card className="group overflow-hidden border-blue-100 hover:border-blue-300 transition-all hover:shadow-2xl">
      {matchScore && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 text-sm text-center">
          <span className="tracking-wide">{matchScore}% AI Match</span>
        </div>
      )}
      
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 items-center mb-6">
          {/* Diamond */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 p-4 border border-blue-100">
              <ImageWithFallback
                src={diamond.image}
                alt={`${diamond.shape} Diamond`}
                className="w-full h-full object-contain"
              />
            </div>
            <Badge className="absolute -top-2 -right-2 bg-blue-600 text-xs">
              {diamond.carat}ct
            </Badge>
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
                src={setting.image}
                alt={setting.name}
                className="w-full h-full object-contain"
              />
            </div>
            <Badge className="absolute -top-2 -right-2 bg-slate-600 text-xs">
              {setting.metal}
            </Badge>
          </div>
        </div>

        {/* Diamond Details */}
        <div className="space-y-3 mb-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-500 tracking-wide uppercase mb-1">Diamond</p>
            <p className="text-sm">{diamond.shape} {diamond.cut}</p>
            <div className="flex gap-3 text-xs text-slate-600 mt-1">
              <span>{diamond.color} Color</span>
              <span>•</span>
              <span>{diamond.clarity}</span>
            </div>
          </div>
          
          {/* Setting Details */}
          <div>
            <p className="text-xs text-slate-500 tracking-wide uppercase mb-1">Setting</p>
            <p className="text-sm">{setting.name}</p>
            <p className="text-xs text-slate-600 mt-1">{setting.style}</p>
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
