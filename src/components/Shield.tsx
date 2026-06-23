
export function Shield({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2.5 4.5 5.2v5.8c0 4.8 3.2 7.7 7.5 8.9 4.3-1.2 7.5-4.1 7.5-8.9V5.2L12 2.5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="10" r="1.7" fill="var(--color-gold)" />
      <path d="M12 11.2v3.1" stroke="var(--color-gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
