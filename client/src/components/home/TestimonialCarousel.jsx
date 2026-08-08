import { useState } from "react";

// ASSUMPTION: static placeholder testimonials — Section 5.10's admin-editable
// testimonials CMS is Pass 3; content here is illustrative demo data.
const TESTIMONIALS = [
  {
    name: "Anita Malhotra",
    city: "Hisar",
    quote: "Our generation went up noticeably within a week of the clean. The crew was professional and the digital report gave us real numbers, not just a promise.",
  },
  {
    name: "Deepak Verma",
    city: "Panchkula",
    quote: "Finally a cleaning service that shows up on time and uses proper DM water instead of tap water. Switched our whole society's AMC to EaseMyClean.",
  },
  {
    name: "Priya Nair",
    city: "Chandigarh",
    quote: "The health audit caught a loose connector we didn't know about. Genuinely felt like they cared about our system, not just the sale.",
  },
];

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const t = TESTIMONIALS[index];

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="card">
        <p className="text-lg italic text-gray-700">&ldquo;{t.quote}&rdquo;</p>
        <p className="mt-4 font-semibold text-ink">{t.name}</p>
        <p className="text-sm text-gray-500">{t.city}</p>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            aria-label={`Show testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${i === index ? "bg-forest" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
