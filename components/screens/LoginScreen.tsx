'use client';

import { useState } from 'react';
import { Heart, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onNavigate: () => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onNavigate();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-primary p-3 rounded-2xl">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary">MediVault</h1>
        </div>
        <p className="text-muted-foreground">Secure Healthcare Records</p>
      </div>

      {/* Login Form */}
      <div className="w-full space-y-6 bg-card rounded-3xl p-8 shadow-lg border border-border">
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">or</span>
          </div>
        </div>

        {/* Face ID Button */}
        <button className="w-full py-3 bg-secondary text-primary border-2 border-primary rounded-xl font-semibold hover:bg-accent/10 transition-all flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center text-sm">
            👤
          </div>
          Face ID
        </button>

        {/* Emergency Access Button */}
        <button className="w-full py-3 bg-red-50 text-red-700 border-2 border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-all flex items-center justify-center gap-2">
          <AlertCircle size={20} />
          Emergency Access
        </button>
      </div>

      {/* Sign Up Link */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Don&apos;t have an account?{' '}
          <a href="#" className="text-primary font-semibold hover:underline">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
