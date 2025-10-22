import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useZodForm } from '../hooks/useZodForm';
import { LoginSchema } from '../schemas/auth.schema';

export default function LoginForm() {
  const [serverError, setServerError] = useState('');
  const { login } = useAuthStore();

  const {
    values,
    isSubmitting,
    getFieldProps,
    getFieldError,
    handleSubmit
  } = useZodForm({
    schema: LoginSchema,
    initialValues: {
      email: '',
      password: ''
    },
    onSubmit: async (data) => {
      setServerError('');
      try {
        await login(data.email, data.password);
        // Small delay to ensure state is updated
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      }
    }
  });

  const emailError = getFieldError('email');
  const passwordError = getFieldError('password');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-md flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <span className="flex-1">{serverError}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
          📧 Email Address
        </label>
        <input
          type="email"
          id="email"
          {...getFieldProps('email')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors bg-gray-50 ${
            emailError
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-[#4b9aaa]'
          }`}
          placeholder="your@email.com"
        />
        {emailError && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {emailError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">
          🔐 Password
        </label>
        <input
          type="password"
          id="password"
          {...getFieldProps('password')}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors bg-gray-50 ${
            passwordError
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-[#4b9aaa]'
          }`}
          placeholder="Enter your password"
        />
        {passwordError && (
          <p id="password-error" className="mt-1 text-sm text-red-600">
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2 w-4 h-4 text-[#4b9aaa] rounded focus:ring-[#4b9aaa]" />
          <span className="text-gray-600">Remember me</span>
        </label>
        <a href="#" className="text-[#4b9aaa] hover:text-[#814256] transition-colors">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-gradient-to-r from-[#814256] to-[#6a3646] text-white font-bold rounded-lg hover:from-[#6a3646] hover:to-[#5a2d38] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> Logging in...
          </span>
        ) : (
          'Login to Community'
        )}
      </button>
    </form>
  );
}