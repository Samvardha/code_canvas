import { Skeleton } from "./Skeleton";

export function PostCardSkeleton() {
  return (
    <div className="w-full bg-surface border border-border">
      {/* Header */}
      <div className="p-4 sm:p-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Skeleton width={48} height={48} />
          <div className="flex flex-col gap-2 mt-1">
            {/* Username */}
            <Skeleton width={120} height={14} />
            {/* Handle & Meta */}
            <div className="flex items-center gap-2">
              <Skeleton width={60} height={10} />
              <div className="w-0.5 h-0.5 bg-border rounded-full" />
              <Skeleton width={140} height={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 pb-6 space-y-3">
        <Skeleton width="90%" height={16} />
        <Skeleton width="95%" height={16} />
        <Skeleton width="60%" height={16} />

        {/* Media Placeholder (Simulate a 16:10 aspect ratio) */}
        <div className="mt-6 border border-border overflow-hidden">
          <Skeleton width="100%" height="240px" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-6 border-t border-border flex items-center gap-8">
        <Skeleton width={60} height={20} />
        <Skeleton width={60} height={20} />
        <Skeleton width={30} height={20} />
      </div>
    </div>
  );
}
