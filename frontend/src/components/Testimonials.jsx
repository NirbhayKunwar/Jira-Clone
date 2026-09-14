import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: "Jira unified our product, design, and engineering teams under a single dashboard. We saw a 38% increase in task completion speed during the very first sprint.",
    author: "Sarah Jenkins",
    role: "VP of Engineering, Spotify-clone",
    metricValue: 38,
    metricSuffix: "% Sprint Speedup",
    logo: "Spotify-Clone"
  },
  {
    quote: "The open DevOps integrations in Jira allowed our pipeline builds and GitHub PRs to sync automatically. We eliminated 5 hours of meetings per week for every developer.",
    author: "Marcus Aurelius",
    role: "Director of Product, Canva-clone",
    metricValue: 5,
    metricSuffix: " Hours Saved Weekly",
    logo: "Canva-Clone"
  },
  {
    quote: "No-code automation rules in Jira Service Desk resolved 45% of customer tickets instantly without support agent intervention. It scaled our capacity 3x.",
    author: "Elena Rostova",
    role: "Head of Operations, eBay-clone",
    metricValue: 45,
    metricSuffix: "% Auto-Resolution",
    logo: "eBay-Clone"
  }
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const current = TESTIMONIALS[currentIndex];

  return (
    <section data-section-id="testimonials" id="testimonials" className="py-20 bg-dominant-offset border-t border-border-secondary overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-accent bg-accent-light px-3 py-1 rounded-full uppercase tracking-wider">
            Customer Success
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-text-secondary tracking-tight mt-4">
            Trusted by the world's best teams
          </h2>
          <p className="mt-4 text-text-secondary-muted text-sm sm:text-base">
            See how organizations of all sizes use Jira to deliver products faster and keep teams aligned.
          </p>
        </div>

        {/* Testimonial slider card frame */}
        <div className="relative max-w-4xl mx-auto">
          {/* Card */}
          <div className="bg-card-secondary bg-gradient-to-r from-accent-light/20 to-transparent rounded-2xl border border-border-secondary p-8 sm:p-12 shadow-md relative">
            <Quote className="absolute top-6 right-8 w-16 h-16 text-text-secondary-muted/10 pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Left Column */}
              <div className="md:col-span-4 text-center md:text-left border-b md:border-b-0 md:border-r border-border-secondary pb-6 md:pb-0 md:pr-6">
                <span className="font-display font-extrabold text-3xl sm:text-4xl block text-accent">
                  {current.metricValue}{current.metricSuffix}
                </span>
                <span className="text-xs font-bold text-text-secondary-muted uppercase tracking-wider mt-2 block">
                  Measured Benefit
                </span>
                <span className="text-sm font-semibold text-text-secondary mt-4 block">
                  Company: {current.logo}
                </span>
              </div>

              {/* Right Column */}
              <div className="md:col-span-8 space-y-6">
                <p className="text-base sm:text-lg md:text-xl font-medium text-text-secondary italic leading-relaxed">
                  "{current.quote}"
                </p>

                <div>
                  <h4 className="font-bold text-text-secondary text-base">{current.author}</h4>
                  <p className="text-xs text-text-secondary-muted mt-0.5">{current.role}</p>
                </div>
              </div>

            </div>
          </div>

          {/* Slider controls */}
          <div className="flex items-center justify-between mt-8">
            {/* Dots */}
            <div className="flex space-x-2">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer ${
                    idx === currentIndex ? 'bg-accent w-6' : 'bg-border-secondary'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation arrows */}
            <div className="flex space-x-3">
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full border border-border-secondary flex items-center justify-center text-text-secondary-muted hover:text-accent hover:border-accent hover:bg-card-secondary shadow-sm cursor-pointer"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full border border-border-secondary flex items-center justify-center text-text-secondary-muted hover:text-accent hover:border-accent hover:bg-card-secondary shadow-sm cursor-pointer"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>



      </div>
    </section>
  );
}
