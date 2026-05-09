export default function LeafDecoration({ className = "" }) {
  return (
    <div className={`pointer-events-none absolute opacity-[0.06] ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="currentColor">
        <path d="M100 10 C60 40, 20 80, 30 140 C40 170, 70 190, 100 190 C130 190, 160 170, 170 140 C180 80, 140 40, 100 10Z" />
        <path d="M100 30 L100 170" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M100 60 L70 80" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M100 80 L130 100" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M100 100 L65 125" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M100 120 L135 140" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
      </svg>
    </div>
  );
}