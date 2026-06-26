import { cn } from "@/lib/utils";

export function AppleWalletIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(className)}
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.36 12.9c-.02-2.06 1.68-3.05 1.76-3.1-0.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.04 8.23.69.99 1.51 2.1 2.58 2.06 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.7.65 1.12-.02 1.83-1.01 2.51-2.01.79-1.15 1.12-2.27 1.13-2.33-.02-.01-2.17-.83-2.19-3.29zM14.3 6.84c.57-.69.95-1.65.85-2.6-.82.03-1.81.54-2.4 1.23-.53.61-.99 1.59-.86 2.52.91.07 1.84-.46 2.41-1.15z" />
    </svg>
  );
}

export function GoogleWalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn(className)} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3.5" fill="#4285F4" />
      <rect x="2" y="5" width="20" height="6" rx="3.5" fill="#34A853" />
      <rect x="2" y="9" width="20" height="3.5" fill="#FBBC04" />
      <rect x="14.5" y="11" width="7.5" height="5" rx="2.5" fill="#EA4335" />
      <circle cx="17" cy="13.5" r="1.4" fill="#fff" />
    </svg>
  );
}
