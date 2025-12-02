import { Search, ShoppingBag, User, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function Header() {
  return (
    <header className="border-b border-blue-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3 border-b border-blue-50">
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <a href="#" className="hover:text-blue-600 transition-colors">Our Story</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Appointments</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Education</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>

        {/* Main header */}
        <div className="flex items-center justify-between py-4">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 lg:flex-none">
            <h1 className="text-2xl tracking-wider bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              STYLESTREAM
            </h1>
            <p className="text-xs text-slate-500 tracking-widest">AI POWERED LUXURY</p>
          </div>

          <nav className="hidden lg:flex items-center gap-8 flex-1 justify-center">
            <a href="#" className="text-sm tracking-wide hover:text-blue-600 transition-colors">Engagement</a>
            <a href="#" className="text-sm tracking-wide hover:text-blue-600 transition-colors">Wedding</a>
            <a href="#" className="text-sm tracking-wide hover:text-blue-600 transition-colors">Fine Jewelry</a>
            <a href="#" className="text-sm tracking-wide hover:text-blue-600 transition-colors font-semibold text-blue-600">AI Stylist</a>
            <a href="#" className="text-sm tracking-wide hover:text-blue-600 transition-colors">Collections</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <ShoppingBag className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
