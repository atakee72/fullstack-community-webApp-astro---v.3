import React, { useState } from 'react';
// Import from the new Better Auth store
import { useAuthStore } from '../stores/authStore.better-auth';

/**
 * Updated RegisterForm component for Better Auth
 * This maintains the same UI/UX but uses Better Auth for user registration
 */
export default function RegisterForm() {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, signInWithProvider } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await register(formData.userName, formData.email, formData.password);
      // Better Auth handles session automatically
      // Redirect to home or profile page
      window.location.href = '/';
    } catch (err) {
      // Better Auth provides detailed error messages
      if (err instanceof Error) {
        if (err.message.includes('already exists')) {
          setError('An account with this email already exists. Please login instead.');
        } else if (err.message.includes('username')) {
          setError('This username is already taken. Please choose another.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Registration failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider: 'github' | 'google') => {
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(`Failed to sign up with ${provider}`);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-md flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="userName" className="block text-gray-700 font-semibold mb-2">
            👤 Username
          </label>
          <input
            type="text"
            id="userName"
            name="userName"
            value={formData.userName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors bg-gray-50"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
            📧 Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors bg-gray-50"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
            🔐 Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors bg-gray-50"
            placeholder="At least 6 characters"
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">
            🔐 Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#4b9aaa] transition-colors bg-gray-50"
            placeholder="Confirm your password"
          />
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms"
            className="mt-1 w-4 h-4 text-[#4b9aaa] rounded focus:ring-[#4b9aaa]"
            required
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#4b9aaa] to-[#3a7888] text-white font-bold rounded-lg hover:from-[#3a7888] hover:to-[#2a5866] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Creating account...
            </span>
          ) : (
            'Join Community'
          )}
        </button>
      </form>

      {/* Social signup options (ready when you add OAuth providers) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialSignup('github')}
              className="flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled
              title="Configure GitHub OAuth in Better Auth to enable"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              GitHub
            </button>

            <button
              type="button"
              onClick={() => handleSocialSignup('google')}
              className="flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled
              title="Configure Google OAuth in Better Auth to enable"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
                <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
              </svg>
              Google
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-3">
            Social signup will create a new account instantly
          </p>
        </div>
      )}
    </div>
  );
}