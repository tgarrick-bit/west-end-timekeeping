export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#e8e4df] border-t-[#e31c79] rounded-full animate-spin" />
        <p style={{ fontSize: 12, color: '#ccc' }}>{message}</p>
      </div>
    </div>
  );
}
