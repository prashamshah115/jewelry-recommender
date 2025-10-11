import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, BookOpen, Sparkles, MessageSquare, StickyNote, Zap, Brain, Lightbulb } from 'lucide-react';

export function LoginPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('[Login]', err);
    } finally {
      setLoading(false);
    }
  };

  // Landing page view
  if (!showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Hero Text */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Read Smarter.
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Understand Faster.
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Upload any textbook and let AI explain concepts, generate practice questions, and help you master the material
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => {
                  setShowAuth(true);
                  setIsLogin(false);
                }}
              >
                Get Started →
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => {
                  setShowAuth(true);
                  setIsLogin(true);
                }}
              >
                Sign In
              </Button>
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">AI Explanations</h3>
                <p className="text-sm text-gray-600">
                  Select any text and get instant, context-aware explanations tailored to your understanding
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Practice Questions</h3>
                <p className="text-sm text-gray-600">
                  Auto-generated quizzes based on each page's content to test your knowledge
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <StickyNote className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Smart Notes</h3>
                <p className="text-sm text-gray-600">
                  Take notes alongside your reading, organized by page and chapter
                </p>
              </div>
            </div>

            {/* Additional Features */}
            <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
              <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg">
                <MessageSquare className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900">Contextual Chat</h4>
                  <p className="text-xs text-gray-600">Ask questions about the content and get detailed answers</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/60 p-4 rounded-lg">
                <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-gray-900">Real-World Applications</h4>
                  <p className="text-xs text-gray-600">Discover how concepts apply in practice</p>
                </div>
              </div>
            </div>

            {/* Social Proof / Trust Badge */}
            <div className="pt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Powered by advanced AI • Instant PDF viewing • Privacy-focused</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Auth form view
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 p-4">
      {/* Back to landing button */}
      <button
        onClick={() => setShowAuth(false)}
        className="absolute top-4 left-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        ← Back
      </button>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? 'Sign in to continue your learning journey'
              : 'Join to start reading with AI assistance'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Sign Up'
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                className="text-primary hover:underline"
                disabled={loading}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {!isLogin && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Note: Only whitelisted emails can create accounts. Contact the administrator if
                you need access.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

