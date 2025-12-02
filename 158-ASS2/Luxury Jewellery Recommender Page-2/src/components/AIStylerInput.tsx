import { useState, useRef } from "react";
import { Sparkles, Upload, Image as ImageIcon, X } from "lucide-react";
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
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          <p className="text-sm text-slate-600">Describe your dream ring in detail</p>
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
          {!showImageUpload && !selectedImage && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowImageUpload(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Image (Optional)
            </Button>
          )}
          
          {showImageUpload && !selectedImage && (
            <div className="flex-1">
              <label
                htmlFor="image-upload"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload inspiration image"
                className="w-full border-2 border-dashed border-blue-200 rounded-lg p-4 hover:border-blue-400 transition-colors flex items-center justify-center gap-3 bg-white/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Upload className="w-5 h-5 text-blue-500" />
                <div className="text-center">
                  <p className="text-sm">Upload inspiration image (optional)</p>
                </div>
              </label>
              <input
                ref={fileInputRef}
                id="image-upload"
                name="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ 
                  position: 'absolute',
                  width: 0,
                  height: 0,
                  opacity: 0,
                  pointerEvents: 'none',
                  overflow: 'hidden'
                }}
                aria-label="File input for image upload"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImageUpload(false)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </Button>
            </div>
          )}

          {selectedImage && (
            <div className="flex-1 flex items-center gap-3 p-3 border border-blue-200 rounded-lg bg-white/50">
              <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedImage.name}</p>
                <p className="text-xs text-slate-500">Image attached</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            type="button"
            size="lg"
            disabled={!description.trim() && !selectedImage}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Recommendations
          </Button>
        </div>
      </div>
    </Card>
  );
}
