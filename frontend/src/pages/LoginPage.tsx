import React, { useState } from 'react';
import { authApi } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email ID');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authApi.loginEmail(email.trim());
      if (res.success && res.user) {
        localStorage.setItem('reachinbox_user_email', res.user.email);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authApi.getGoogleAuthUrl();
      if (res.isConfigured && res.url) {
        // Redirect to real Google OAuth
        window.location.href = res.url;
      } else {
        setErrorMessage(
          res.message || 'Google OAuth is not configured. Please log in using your email address.'
        );
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMessage('Google authentication is not available. Please log in using your email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col items-center justify-center p-4">
      {/* Centered Login Card matching Screenshot 1 */}
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] border border-gray-100 animate-fade-in">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Login
        </h1>

        {/* Login with Google Button matching Screenshot 1 */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#e6f4ea] hover:bg-[#dceddd] text-[#137333] font-medium text-xs rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-xs"
        >
          {/* Official Google 'G' icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider matching Screenshot 1 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-white px-3 text-gray-400">
              or sign up through email
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Email & Password Form matching Screenshot 1 */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              className="w-full px-4 py-2.5 bg-[#f4f5f7] border-0 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 bg-[#f4f5f7] border-0 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-[#00a854] hover:bg-[#009247] text-white font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
