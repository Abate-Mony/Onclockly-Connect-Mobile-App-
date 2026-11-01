import dayjs from "dayjs"

export const formatDate = (iso: string, pattern = "D MMM YYYY") => dayjs(iso).format(pattern)

const SYMBOLS: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" }

export const money = (amount: number, currency = "GBP") =>
  `${SYMBOLS[currency] ?? currency + " "}${amount.toFixed(2)}`
