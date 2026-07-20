'use client';

import { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToRegistration: () => void;
}

export default function LoginScreen({ onLogin, onSwitchToRegistration }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    onLogin(email, password);
    setError('Invalid email or password');
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">Access your medical records</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          Sign In <ArrowRight className="w-5 h-5" />
        </button>
      </form>

      {/* Demo Credentials Hint */}
      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-cyan-900 dark:text-cyan-300">Demo Credentials</p>
        <p className="text-xs text-cyan-800 dark:text-cyan-400">Email: test@example.com</p>
        <p className="text-xs text-cyan-800 dark:text-cyan-400">Password: password123</p>
      </div>

      {/* Switch to Registration */}
      <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Don&apos;t have an account?{' '}
          <button
            onClick={onSwitchToRegistration}
            className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
