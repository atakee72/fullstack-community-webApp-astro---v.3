"use client";

import { useState, useEffect } from "react";
import { BookmarkIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsCard {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  timeAgo: string;
  location: string;
  image: string;
  gradientColors?: string[];
  content?: string[];
}

interface StatusBar {
  id: string;
  category: string;
  subcategory: string;
  length: number;
  opacity: number;
}

interface NewsCardsProps {
  title?: string;
  subtitle?: string;
  statusBars?: StatusBar[];
  newsCards?: NewsCard[];
  enableAnimations?: boolean;
}

const defaultStatusBars: StatusBar[] = [
  {
    id: "1",
    category: "Community",
    subcategory: "Local News",
    length: 3,
    opacity: 1,
  },
  {
    id: "2",
    category: "Events",
    subcategory: "Upcoming",
    length: 2,
    opacity: 0.7,
  },
  {
    id: "3",
    category: "Announcements",
    subcategory: "Important",
    length: 1,
    opacity: 0.4,
  }
];

const defaultNewsCards: NewsCard[] = [
  {
    id: "1",
    title: "Community Garden Project Launches This Weekend",
    category: "Community",
    subcategory: "Local Initiative",
    timeAgo: "15 min ago",
    location: "Mahalle Park",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&h=900&fit=crop&q=80",
    gradientColors: ["from-[#4b9aaa]/30", "to-[#3a7a8a]/30"],
    content: [
      "The long-awaited community garden project is finally launching this weekend at Mahalle Park. Residents have been planning this initiative for over six months, and the first planting day is scheduled for Saturday morning.",
      "Local volunteers will be on hand to help newcomers learn the basics of urban gardening. The project aims to bring neighbors together while providing fresh produce for the community.",
      "Registration is open for anyone interested in claiming a plot. Families, individuals, and local organizations are all welcome to participate in this green initiative.",
    ]
  },
  {
    id: "2",
    title: "New Recycling Program Starts Next Month",
    category: "Environment",
    subcategory: "Sustainability",
    timeAgo: "41 min ago",
    location: "District-wide",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1600&h=900&fit=crop&q=80",
    gradientColors: ["from-[#eccc6e]/30", "to-[#d4b85e]/30"],
    content: [
      "A new comprehensive recycling program will be implemented across our district starting next month. The initiative includes separate collection for plastics, paper, glass, and organic waste.",
      "Residents will receive new color-coded bins and a detailed guide on proper waste separation. Educational workshops will be held at the community center to help everyone adapt to the new system.",
      "This program is part of the city's commitment to reduce landfill waste by 50% over the next five years.",
    ]
  },
  {
    id: "3",
    title: "Local Artist Exhibition Opens at Cultural Center",
    category: "Culture",
    subcategory: "Arts",
    timeAgo: "1 hour ago",
    location: "Cultural Center",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&h=900&fit=crop&q=80",
    gradientColors: ["from-[#814256]/30", "to-[#6a3646]/30"],
    content: [
      "The Mahalle Cultural Center is proud to present a new exhibition featuring works by local artists. The show includes paintings, sculptures, and mixed media pieces from over 20 neighborhood creators.",
      "Opening night will feature live music and refreshments, with artists available to discuss their work. The exhibition runs for three weeks and admission is free for all residents.",
      "This is the first of what organizers hope will become an annual tradition celebrating local artistic talent.",
    ]
  }
];

export function NewsCards({
  title = "Neighbourhood News",
  subtitle = "Stories from your community",
  statusBars = defaultStatusBars,
  newsCards = defaultNewsCards,
  enableAnimations = true,
}: NewsCardsProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCard, setSelectedCard] = useState<NewsCard | null>(null);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const shouldAnimate = enableAnimations && !prefersReducedMotion;

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    // Trigger load animation
    const timer = setTimeout(() => setIsLoaded(true), 100);

    return () => {
      mediaQuery.removeEventListener('change', handler);
      clearTimeout(timer);
    };
  }, []);

  const toggleBookmark = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const openCard = (card: NewsCard) => {
    setSelectedCard(card);
    document.body.style.overflow = 'hidden';
  };

  const closeCard = () => {
    setSelectedCard(null);
    document.body.style.overflow = '';
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCard) {
        closeCard();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedCard]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 text-gray-800">
      {/* Header */}
      <div
        className={cn(
          "mb-8 transition-all duration-500",
          shouldAnimate && !isLoaded ? "opacity-0 -translate-y-5" : "opacity-100 translate-y-0"
        )}
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#814256]">{title}</h1>
        <p className="text-gray-600 text-lg">{subtitle}</p>

        {/* Status Bars */}
        <div className="mt-6 space-y-1">
          {statusBars.map((bar, index) => (
            <div
              key={bar.id}
              className={cn(
                "h-0.5 bg-[#814256] rounded-full transition-all duration-700 origin-left",
                shouldAnimate && !isLoaded ? "scale-x-0" : "scale-x-100"
              )}
              style={{
                opacity: bar.opacity,
                width: `${(bar.length / 3) * 100}%`,
                transitionDelay: shouldAnimate ? `${300 + index * 100}ms` : '0ms'
              }}
            />
          ))}
        </div>
      </div>

      {/* News Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {newsCards.map((card, index) => (
          <article
            key={card.id}
            className={cn(
              "bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer group",
              "transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg",
              shouldAnimate && !isLoaded ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
            )}
            style={{
              transitionDelay: shouldAnimate ? `${500 + index * 120}ms` : '0ms'
            }}
            onClick={() => openCard(card)}
          >
            {/* Image with gradient overlay */}
            <div className="relative h-56 overflow-hidden bg-gray-100">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover transform-gpu group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-black/50 to-transparent" />
              {card.gradientColors && (
                <div className={`absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t ${card.gradientColors[0]} ${card.gradientColors[1]} to-transparent`} />
              )}

              {/* Bookmark icon */}
              <button
                className="absolute top-3 right-3 p-1 transition-transform duration-200 hover:scale-110 active:scale-90"
                onClick={(e) => toggleBookmark(card.id, e)}
              >
                <BookmarkIcon
                  className={cn(
                    "w-5 h-5 transition-colors cursor-pointer",
                    bookmarkedCards.has(card.id)
                      ? "text-[#eccc6e] fill-[#eccc6e]"
                      : "text-white/80 hover:text-white"
                  )}
                />
              </button>

              {/* Category and time info */}
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-xs mb-1 opacity-90">
                  {card.category}, {card.subcategory}
                </div>
                <div className="text-xs opacity-75">
                  {card.timeAgo}, {card.location}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-semibold text-lg leading-tight line-clamp-3 text-gray-800 group-hover:text-[#4b9aaa] transition-colors">
                {card.title}
              </h3>
            </div>
          </article>
        ))}
      </div>

      {/* Expanded Card Modal */}
      {selectedCard && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in-simple"
            onClick={closeCard}
          />

          {/* Modal */}
          <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white border border-gray-200 rounded-xl overflow-hidden z-50 animate-slideUp">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center z-10 shadow-md transition-transform duration-200 hover:scale-110 active:scale-90"
              onClick={closeCard}
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>

            <div className="h-full overflow-y-auto">
              {/* Header Image */}
              <div className="relative h-64 md:h-80">
                <img
                  src={selectedCard.image}
                  alt={selectedCard.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
                {selectedCard.gradientColors && (
                  <div className={`absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t ${selectedCard.gradientColors[0]} ${selectedCard.gradientColors[1]} to-transparent`} />
                )}

                {/* Image overlay info */}
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-sm mb-1 opacity-90">
                    {selectedCard.category}, {selectedCard.subcategory}
                  </div>
                  <div className="text-sm opacity-75">
                    {selectedCard.timeAgo}, {selectedCard.location}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-6 text-[#814256]">
                  {selectedCard.title}
                </h1>

                <div className="prose prose-lg max-w-none text-gray-600">
                  {selectedCard.content ? (
                    selectedCard.content.map((paragraph, index) => (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="mb-4">
                      No additional content available for this news item.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
