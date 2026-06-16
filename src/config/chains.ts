import { BNB_MAINNET_CHAIN_ID } from './staking'

export const BNB_MAINNET_CHAIN = {
  id: BNB_MAINNET_CHAIN_ID,
  name: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: ['https://bsc-dataseed.binance.org/'] } },
  blockExplorers: { default: { name: 'BscScan', url: 'https://bscscan.com' } },
} as const

// 测试网在此版本不再支持（仅主网）。

export const BNB_WALLET_CHAIN_PARAMS = {
  mainnet: {
    chainId: '0x38',
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.defibit.io/'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  testnet: {
    chainId: '0x61',
    chainName: 'BNB Smart Chain Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
} as const

/** 用户可见链名称：主网与测试网均显示 BNB Chain */
export function getDisplayChainName(chainId: number | null | undefined): string | null {
  if (!chainId) return null
  if (chainId === BNB_MAINNET_CHAIN_ID) return 'BNB Chain'
  return `Chain ${chainId}`
}

export function isBnbWalletChain(chainId: number | null | undefined): boolean {
  return chainId === BNB_MAINNET_CHAIN_ID
}
