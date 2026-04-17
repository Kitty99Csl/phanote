export default function StatusChip({ status = 'nominal', children }) {
  const colors = {
    nominal: { bg: 'rgba(139, 212, 143, 0.15)', text: '#8BD48F' },
    caution: { bg: 'rgba(245, 166, 35, 0.15)', text: '#f5a623' },
    critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    standby: { bg: 'rgba(107, 114, 128, 0.15)', text: '#8b929b' },
  }
  const { bg, text } = colors[status] || colors.standby

  return (
    <span
      className="inline-block text-[9px] tracking-[0.2em] uppercase font-semibold px-2 py-0.5 rounded-sm"
      style={{ backgroundColor: bg, color: text }}
    >
      {children}
    </span>
  )
}
