export const CURRENCIES = {
  LAK: { symbol: '₭', name: 'Lao Kip', nameShort: 'LAK', decimals: 0 },
  THB: { symbol: '฿', name: 'Thai Baht', nameShort: 'THB', decimals: 2 },
  USD: { symbol: '$', name: 'US Dollar', nameShort: 'USD', decimals: 2 },
}

export function formatAmount(amount, currency) {
  const c = CURRENCIES[currency]
  if (!c) return `${amount}`

  const abs = Math.abs(amount)

  if (currency === 'LAK' && abs >= 1_000_000) {
    return `${c.symbol}${(abs / 1_000_000).toFixed(1)}M`
  }

  return `${c.symbol}${abs.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: c.decimals,
  })}`
}

export function formatAmountSigned(amount, currency, type) {
  const prefix = type === 'income' ? '+' : '-'
  return `${prefix}${formatAmount(amount, currency)}`
}
