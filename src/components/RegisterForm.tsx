import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

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
      // Small delay to ensure state is updated
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
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
  );
}