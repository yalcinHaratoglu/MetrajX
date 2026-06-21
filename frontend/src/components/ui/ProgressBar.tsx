interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`progress-bar${className ? ` ${className}` : ""}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}%`}
    >
      <div
        className="progress-bar-fill"
        style={{
          width: `${clamped}%`,
          minWidth: clamped > 0 ? "0.35rem" : 0,
        }}
      />
      <span className="progress-bar-label">{clamped}%</span>
    </div>
  );
}
