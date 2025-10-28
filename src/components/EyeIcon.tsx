import React from 'react';

interface EyeIconProps {
  viewCount: number;
  createdAt?: number | Date; // Topic creation timestamp
}

export default function EyeIcon({ viewCount, createdAt }: EyeIconProps) {
  // Calculate unique animation delay based on creation timestamp
  const animationDelay = createdAt
    ? `${(typeof createdAt === 'number' ? createdAt : createdAt.getTime()) % 4000}ms`
    : '0ms';

  return (
    <button className="particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-default">
      {/* View count badge - Behind the eye */}
      {viewCount > 0 && (
        <span className="absolute top-0 -right-1 bg-gray-300 text-gray-800 text-[8px] md:text-[10px] font-bold rounded-full min-w-[14px] h-[14px] md:min-w-[16px] md:h-[16px] flex items-center justify-center px-0.5">
          {viewCount}
        </span>
      )}

      <div className="eye-blink relative w-5 h-5 md:w-6 md:h-6 z-10" style={{ '--animation-delay': animationDelay } as React.CSSProperties}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="relative block w-full h-full eye-open"
        >
          {/* Eye outline */}
          <path
            d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
            stroke="#814256"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Pupil */}
          <circle
            cx="12"
            cy="12.5"
            r="3"
            stroke="#814256"
            strokeWidth="2.5"
            fill="none"
          />
        </svg>

        {/* Closed eye (for blink animation) */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full eye-closed opacity-0"
        >
          <path
            d="M12 12.5C7 12.5 2.73 12.5 1 12.5C2.73 12.5 7 12.5 12 12.5C17 12.5 21.27 12.5 23 12.5C21.27 12.5 17 12.5 12 12.5Z"
            stroke="#814256"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes blink {
          0%, 88% {
            opacity: 1;
          }
          92% {
            opacity: 0;
          }
          96% {
            opacity: 1;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes blinkClosed {
          0%, 88% {
            opacity: 0;
          }
          92% {
            opacity: 1;
          }
          96% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        .eye-blink .eye-open {
          animation: blink 4s ease-in-out infinite;
          animation-delay: var(--animation-delay, 0ms);
        }

        .eye-blink .eye-closed {
          animation: blinkClosed 4s ease-in-out infinite;
          animation-delay: var(--animation-delay, 0ms);
        }
      `}</style>
    </button>
  );
}