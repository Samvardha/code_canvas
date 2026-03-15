interface StatCellProps {
  label: string;
  value: number | string;
}

export function StatCell({ label, value }: StatCellProps) {
  return (
    <div className="p-5 bg-background flex flex-col items-center justify-center gap-1 text-center h-full">
      <span className="text-2xl font-black text-white font-(family-name:--font-space-grotesk)">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
        {label}
      </span>
    </div>
  );
}
