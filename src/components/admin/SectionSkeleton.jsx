export default function SectionSkeleton() {
  return (
    <div className="bg-card border rounded-2xl p-5 mb-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-muted" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-3 w-56 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-20 w-full bg-muted rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}