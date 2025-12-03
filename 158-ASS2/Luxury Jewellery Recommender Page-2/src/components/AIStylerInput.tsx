import { useState } from "react";
import { Sparkles, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";

interface AIStylerInputProps {
  onSubmit: (description: string, image?: File) => void;
}

export function AIStylerInput({ onSubmit }: AIStylerInputProps) {
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (description.trim() || selectedImage) {
      onSubmit(description, selectedImage || undefined);
    }
  };

  return (
    <Card className="p-8 border-2 border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl tracking-wide">AI Stylist</h2>
          <p className="text-sm text-slate-600">Describe your dream ring or upload inspiration</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Textarea
            placeholder="E.g., 'I want a vintage-inspired ring with a round brilliant diamond, rose gold setting, and art deco details...'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[120px] resize-none border-blue-200 focus:border-blue-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 hover:border-blue-400 transition-colors flex items-center justify-center gap-3 bg-white/50">
                {imagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                    <div>
                      <p className="text-sm">Image uploaded</p>
                      <p className="text-xs text-slate-500">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-blue-500" />
                    <div className="text-center">
                      <p className="text-sm">Upload inspiration image</p>
                      <p className="text-xs text-slate-500">Optional</p>
                    </div>
                  </>
                )}
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>

          <Button
            onClick={handleSubmit}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg px-8"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Recommendations
          </Button>
        </div>
      </div>
    </Card>
  );
}
