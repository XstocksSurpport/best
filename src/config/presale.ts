/** BNB Chain official USDT (BEP-20) */
export const USDT_BSC_ADDRESS = '0x55d398326f99059fF775485246999027B3197955' as const

/** 预售最低买入金额（USDT） */
export const PRESALE_MIN_USDT = 288

/** 免最低买入门槛的钱包白名单 */
export const PRESALE_MIN_EXEMPT_WHITELIST = [
  '0x808bf22c54951ba0ef2bf33807b760f42276d340',
  '0xeb9c027fa55cee6d722177f06441b451961731fc',
] as const

const PRESALE_MIN_EXEMPT_SET = new Set(
  PRESALE_MIN_EXEMPT_WHITELIST.map((a) => a.toLowerCase()),
)

export function isPresaleMinAmountExempt(address: string | null | undefined): boolean {
  if (!address) return false
  return PRESALE_MIN_EXEMPT_SET.has(address.toLowerCase())
}

export function getPresaleMinUsdt(address: string | null | undefined): number {
  return isPresaleMinAmountExempt(address) ? 0.01 : PRESALE_MIN_USDT
}

/** 已链上完成、需在页面展示持仓的预售记录（仅指定地址） */
export const PRESALE_CREDITED_USDT: Record<string, number> = {
  '0x808bf22c54951ba0ef2bf33807b760f42276d340': 10,
  '0xeb9c027fa55cee6d722177f06441b451961731fc': 10,
}

export function getPresaleCreditedUsdt(address: string | null | undefined): number {
  if (!address) return 0
  return PRESALE_CREDITED_USDT[address.toLowerCase()] ?? 0
}

/** 预售 USDT 直接转入的金库地址（与 djdog312 的 CONFIG.TREASURY 同级） */
export const PRESALE_TREASURY_ADDRESS =
  '0xc71561fAAA3Ac1070878D69A51e33F412DD8208e' as const

const ZERO = '0x0000000000000000000000000000000000000000'

function isValidEvmAddress(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a) && a.toLowerCase() !== ZERO
}

function resolveTreasury(): string | null {
  const raw = import.meta.env.VITE_PRESALE_TREASURY_ADDRESS?.trim()
  if (raw && isValidEvmAddress(raw)) return raw
  if (isValidEvmAddress(PRESALE_TREASURY_ADDRESS)) return PRESALE_TREASURY_ADDRESS
  return null
}

export function isPresaleConfigured(): boolean {
  return resolveTreasury() !== null
}

export function getPresaleTreasuryAddress(): string {
  const t = resolveTreasury()
  if (!t) throw new Error('Invalid presale treasury address.')
  return t
}

/** 旧版合约池（仅 Keeper / Hardhat 使用） */
export const DEFAULT_PRESALE_DEPOSIT_CONTRACT =
  '0x01bFa33D4A3101EA741ED4AE609c397d0c8Dad51' as const
