export const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
        <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_CENTER ]
      </div>
    </div>
  );
};
