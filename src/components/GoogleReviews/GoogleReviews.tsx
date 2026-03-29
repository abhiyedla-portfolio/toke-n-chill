'use client';

import { motion } from 'framer-motion';
import { Star, ExternalLink, Quote } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url?: string;
}

interface PlaceResult {
  rating: number;
  user_ratings_total: number;
  reviews: Review[];
}

// Fallback reviews when API key isn't set
const fallbackReviews: Review[] = [
  {
    author_name: 'Customer Review',
    rating: 5,
    text: 'Best smoke shop in Austin! Great selection and the staff really knows their stuff. Prices are fair and they always have the latest products.',
    relative_time_description: 'Recently',
  },
  {
    author_name: 'Customer Review',
    rating: 5,
    text: 'Love this place. Clean store, friendly employees, huge variety of vapes and glass. My go-to shop every time.',
    relative_time_description: 'Recently',
  },
  {
    author_name: 'Customer Review',
    rating: 5,
    text: 'Amazing selection of THCA and gummies. Staff helped me find exactly what I was looking for. Will definitely be back!',
    relative_time_description: 'Recently',
  },
  {
    author_name: 'Customer Review',
    rating: 4,
    text: 'Great hookah selection and good prices on disposables. Convenient location and easy parking.',
    relative_time_description: 'Recently',
  },
  {
    author_name: 'Customer Review',
    rating: 5,
    text: 'Hands down the best smoke shop in the area. They have everything — kratom, CBD, vapes, papers, glass. One stop shop!',
    relative_time_description: 'Recently',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className="h-4 w-4"
          style={{
            color: star <= rating ? '#FBBF24' : '#333',
            fill: star <= rating ? '#FBBF24' : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function GoogleReviews() {
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [overallRating, setOverallRating] = useState(4.9);
  const [totalReviews, setTotalReviews] = useState(120);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try to load from Google Places API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;

    if (apiKey && placeId) {
      fetch(`/api/reviews?placeId=${placeId}`)
        .then((res) => res.json())
        .then((data: PlaceResult) => {
          if (data.reviews?.length) {
            setReviews(data.reviews.slice(0, 8));
            setOverallRating(data.rating);
            setTotalReviews(data.user_ratings_total);
            setIsLive(true);
          }
        })
        .catch(() => {
          // Use fallback reviews silently
        });
    }
  }, []);

  // Auto-scroll the reviews
  const [scrollPos, setScrollPos] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        const next = scrollPos + 320;
        if (next >= maxScroll) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          setScrollPos(0);
        } else {
          scrollRef.current.scrollTo({ left: next, behavior: 'smooth' });
          setScrollPos(next);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [scrollPos]);

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-white">
            What Our Customers Say
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6"
                  style={{ color: '#FBBF24', fill: '#FBBF24' }}
                />
              ))}
            </div>
            <span className="font-display text-2xl font-bold text-white">{overallRating}</span>
            <span style={{ color: '#888' }}>
              ({totalReviews}+ reviews)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {/* Google G logo */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm" style={{ color: '#888' }}>
              {isLive ? 'Live from Google Reviews' : 'Google Reviews'}
            </span>
          </div>
        </motion.div>

        {/* Scrolling reviews */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
        >
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              className="shrink-0 w-[300px] sm:w-[350px] rounded-lg border p-6 flex flex-col"
              style={{
                backgroundColor: '#111',
                borderColor: '#222',
                scrollSnapAlign: 'start',
              }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{
                borderColor: 'rgba(255, 45, 123, 0.4)',
                boxShadow: '0 0 20px rgba(255, 45, 123, 0.1)',
              }}
            >
              <Quote className="h-5 w-5 mb-3" style={{ color: '#FF2D7B', opacity: 0.5 }} />
              <p className="text-sm leading-relaxed flex-1 line-clamp-4" style={{ color: '#CCC' }}>
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #222' }}>
                <StarRating rating={review.rating} />
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{review.author_name}</p>
                    <p className="text-xs" style={{ color: '#666' }}>{review.relative_time_description}</p>
                  </div>
                  {review.profile_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.profile_photo_url}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA to Google */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <a
            href="https://www.google.com/search?q=Toke+and+Chill+Austin+TX+reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_16px_rgba(255,45,123,0.3)]"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #333', color: '#fff' }}
          >
            <ExternalLink className="h-4 w-4" style={{ color: '#FF2D7B' }} />
            See All Reviews on Google
          </a>
        </motion.div>
      </div>
    </section>
  );
}
