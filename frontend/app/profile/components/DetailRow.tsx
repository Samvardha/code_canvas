interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
}

export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-2 text-text-secondary min-w-0">
      <span className="text-accent text-[10px] shrink-0">{icon}</span>
      <span className="uppercase tracking-widest text-[10px] font-bold w-28 shrink-0">
        {label}
      </span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}
