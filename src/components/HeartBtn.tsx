import React, { useState } from 'react';

interface HeartBtnProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  disabled?: boolean;
}

export default function HeartBtn({ isLiked, likeCount, onToggle, disabled = false }: HeartBtnProps) {
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; distance: number }>>([]);

  const FADE_DURATION = 1000;

  const random = (lower: number = 0, upper: number = 1): number => {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  };

  const handleClick = () => {
    if (disabled) return;

    onToggle();

    // Only create particles when liking (not unliking)
    if (!isLiked) {
      const newParticles = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        angle: random(0, 360),
        distance: random(32, 40)
      }));

      setParticles(newParticles);

      // Remove particles after animation
      setTimeout(() => {
        setParticles([]);
      }, FADE_DURATION + 200);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`particleButton relative p-1 md:p-1.5 bg-transparent border-none rounded-full cursor-pointer transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${isLiked ? 'liked' : ''}`}
      aria-label={isLiked ? 'Unlike this post' : 'Like this post'}
    >
      {/* Like count badge - Behind the heart */}
      {likeCount > 0 && (
        <span className="absolute top-0 -right-1 bg-gray-300 text-gray-800 text-[8px] md:text-[10px] font-bold rounded-full min-w-[14px] h-[14px] md:min-w-[16px] md:h-[16px] flex items-center justify-center px-0.5">
          {likeCount}
        </span>
      )}

      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="relative block w-5 h-5 md:w-6 md:h-6 z-10"
      >
        <path
          d="M3.68546 5.43796C8.61936 1.29159 11.8685 7.4309 12.0406 7.4309C12.2126 7.43091 15.4617 1.29159 20.3956 5.43796C26.8941 10.8991 13.5 21.8215 12.0406 21.8215C10.5811 21.8215 -2.81297 10.8991 3.68546 5.43796Z"
          stroke="#814256"
          strokeWidth="2"
          strokeLinecap="round"
          className={`transition-all ${isLiked ? 'fill-[#814256] stroke-[#814256]' : 'fill-none stroke-[#814256]'}`}
        />
      </svg>

      {/* Particles */}
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="particle absolute inset-0 m-auto w-3 h-3 rounded-full bg-white pointer-events-none"
          style={{
            // @ts-ignore - CSS custom properties
            '--angle': `${particle.angle}deg`,
            '--distance': `${particle.distance}px`,
            '--fade-duration': `${FADE_DURATION}ms`,
            '--particle-curve': 'cubic-bezier(0.2, 0.56, 0, 1)'
          }}
        />
      ))}

      <style>{`
        @keyframes fadeToTransparent {
          to {
            opacity: 0;
          }
        }

        @keyframes disperse {
          to {
            transform: translate(
              calc(cos(var(--angle)) * var(--distance)),
              calc(sin(var(--angle)) * var(--distance))
            );
          }
        }

        .particle {
          animation:
            fadeToTransparent var(--fade-duration) forwards,
            disperse 500ms forwards var(--particle-curve);
        }

        .particleButton:hover svg path {
          stroke: #814256;
        }

        .particleButton.liked svg path {
          fill: #814256;
          stroke: #814256;
        }
      `}</style>
    </button>
  );
}