export default function HolidayBadge({ holiday }) {
  if (!holiday) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-accent/20 border border-accent/40">
      <span className="text-base leading-none">{holiday.emoji}</span>
      <span className="text-xs font-bold text-accent-foreground">{holiday.name}</span>
    </div>
  );
}