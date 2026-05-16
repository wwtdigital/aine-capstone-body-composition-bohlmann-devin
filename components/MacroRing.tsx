type Props = {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  valueDisplay: string
  goalDisplay: string
}

export default function MacroRing({
  value,
  max,
  size = 104,
  strokeWidth = 8,
  color,
  label,
  valueDisplay,
  goalDisplay,
}: Props) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, value / max))
  const offset = circumference * (1 - pct)
  const c = size / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={c} cy={c} r={r}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-zinc-200 dark:stroke-zinc-800"
          />
          <circle
            cx={c} cy={c} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          <span className="text-zinc-900 dark:text-white font-bold tabular-nums" style={{ fontSize: size < 90 ? 13 : 15 }}>
            {valueDisplay}
          </span>
          <span className="text-zinc-500 dark:text-zinc-500 text-xs mt-0.5">{label}</span>
        </div>
      </div>
      <span className="text-zinc-400 dark:text-zinc-600 text-xs">/ {goalDisplay}</span>
    </div>
  )
}
