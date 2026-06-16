import { parseEther } from 'ethers'

/** 每次领取固定 0.27 BNB */
export const STAKE_BNB_AMOUNT = '0.27'
export const STAKE_BNB_WEI = parseEther(STAKE_BNB_AMOUNT)

export const BNB_MAINNET_CHAIN_ID = 56

/** 合约管理员（可提取资金） */
export const STAKING_OWNER_ADDRESS =
  '0xeb9c027fa55cee6d722177f06441b451961731fc' as const

/** BSC 主网 BnbStaking */
const DEFAULT_STAKING_CONTRACT_MAINNET =
  '0xf24Df1a9e2b970B8BDe387f6Fb20E78F3f5beb4d' as const

const ZERO = '0x0000000000000000000000000000000000000000'

function isValidEvmAddress(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a) && a.toLowerCase() !== ZERO
}

function resolveStakingContract(): string | null {
  const raw = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS?.trim()
  if (raw && isValidEvmAddress(raw)) return raw
  if (isValidEvmAddress(DEFAULT_STAKING_CONTRACT_MAINNET)) return DEFAULT_STAKING_CONTRACT_MAINNET
  return null
}

export function isClaimChain(chainId: number | null | undefined): boolean {
  return chainId === BNB_MAINNET_CHAIN_ID
}

export function isStakingConfigured(chainId?: number | null): boolean {
  return resolveStakingContract() !== null
}

export function getStakingContractAddress(chainId: number): string {
  if (chainId !== BNB_MAINNET_CHAIN_ID) {
    throw new Error('Staking only available on BNB Chain mainnet (chainId 56).')
  }
  const addr = resolveStakingContract()
  if (!addr) throw new Error('Staking contract not configured.')
  return addr
}
