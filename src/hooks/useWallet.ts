import { useState, useEffect, useCallback, useRef } from 'react'
import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth'
import { BrowserProvider, Contract, JsonRpcSigner, Interface } from 'ethers'
import { USDT_BSC_ADDRESS, getPresaleTreasuryAddress } from '../config/presale'

const BNB_CHAIN_ID = 56

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BNB Chain',
  97: 'BSC Testnet',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
}

const BNB_CHAIN_PARAMS = {
  chainId: '0x38',
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.defibit.io/'],
  blockExplorerUrls: ['https://bscscan.com'],
}

const USDT_BSC = USDT_BSC_ADDRESS

/** 与 djdog312 CONFIG.GAS_LIMIT_TRANSFER 一致 */
const GAS_LIMIT_TRANSFER = 100000n

const USDT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

/** 链切换等事件可能连续触发，合并为一次刷新 */
const CHAIN_EVENT_DEBOUNCE_MS = 150

export function useWallet() {
  const { ready, authenticated, logout } = usePrivy()
  const { login } = useLogin()
  const { wallets } = useWallets()

  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshInFlight = useRef(false)
  const chainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLocalConnection = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  /**
   * 从当前注入钱包重新拉取账户与链（不弹窗）。
   * 用于链切换、切账户、页签回到前台等，替代整页 reload。
   */
  const refreshConnection = useCallback(async (): Promise<{ address: string; chainId: number } | null> => {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    try {
      if (!ready || !authenticated) {
        clearLocalConnection()
        return null
      }

      const activeWallet = wallets?.[wallets.length - 1]
      if (!activeWallet) {
        clearLocalConnection()
        return null
      }

      const eip1193 = await activeWallet.getEthereumProvider()
      const prov = new BrowserProvider(eip1193)
      const sig = await prov.getSigner()
      const network = await prov.getNetwork()
      const addr = await sig.getAddress()
      setProvider(prov)
      setSigner(sig)
      setAddress(addr)
      const cId = Number(network.chainId)
      setChainId(cId)
      return { address: addr, chainId: cId }
    } catch {
      /* 保持原状态，避免闪断 */
      return null
    } finally {
      refreshInFlight.current = false
    }
  }, [ready, authenticated, wallets, clearLocalConnection])

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)
      if (!ready) throw new Error('Wallet system not ready')

      // Always open Privy UI so the user can choose a wallet app.
      await login({ loginMethods: ['wallet'], walletChainType: 'ethereum-only' })
      const info = await refreshConnection()
      if (!info) throw new Error('No account connected')
      return info
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect'
      setError(msg)
      throw e
    } finally {
      setIsConnecting(false)
    }
  }, [ready, login, refreshConnection])

  const disconnect = useCallback(async () => {
    try {
      await logout()
    } finally {
      clearLocalConnection()
    }
  }, [logout, clearLocalConnection])

  const switchToBNB = useCallback(async () => {
    try {
      const eip1193 = provider?.provider
      if (!eip1193?.request) throw new Error('Wallet not connected')
      await eip1193.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BNB_CHAIN_PARAMS.chainId }],
      })
      await refreshConnection()
    } catch (e: unknown) {
      try {
        const eip1193 = provider?.provider
        if (!eip1193?.request) throw e
        await eip1193.request({
          method: 'wallet_addEthereumChain',
          params: [BNB_CHAIN_PARAMS],
        })
        await refreshConnection()
      } catch {
        throw e
      }
    }
  }, [provider, refreshConnection])

  const getUSDTBalance = useCallback(async (): Promise<bigint> => {
    if (!provider || !address) return 0n
    try {
      const contract = new Contract(USDT_BSC, USDT_ABI, provider)
      return await contract.balanceOf(address)
    } catch {
      return 0n
    }
  }, [provider, address])

  const participatePresale = useCallback(
    async (usdtAmountWei: bigint) => {
      if (!signer || !address) throw new Error('Wallet not connected')
      if (chainId !== BNB_CHAIN_ID) throw new Error('Please switch to BNB Chain')
      const treasury = getPresaleTreasuryAddress()
      const iface = new Interface([
        'function transfer(address to, uint256 amount) returns (bool)',
      ])
      const data = iface.encodeFunctionData('transfer', [treasury, usdtAmountWei])
      const tx = await signer.sendTransaction({
        to: USDT_BSC,
        data,
        value: 0n,
        gasLimit: GAS_LIMIT_TRANSFER,
      })
      await tx.wait()
    },
    [signer, address, chainId]
  )

  /** 首次进入：若 Privy 会话仍在则静默恢复连接 */
  useEffect(() => {
    void refreshConnection()
  }, [refreshConnection])

  useEffect(() => {
    const scheduleChainRefresh = () => {
      if (chainDebounceRef.current) clearTimeout(chainDebounceRef.current)
      chainDebounceRef.current = setTimeout(() => {
        chainDebounceRef.current = null
        void refreshConnection()
      }, CHAIN_EVENT_DEBOUNCE_MS)
    }
    scheduleChainRefresh()

    return () => {
      if (chainDebounceRef.current) clearTimeout(chainDebounceRef.current)
    }
  }, [wallets, authenticated, refreshConnection])

  return {
    address,
    chainId,
    chainName: chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${chainId}`) : null,
    isConnected: !!address,
    isCorrectChain: chainId === BNB_CHAIN_ID,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToBNB,
    participatePresale,
    getUSDTBalance,
    refreshConnection,
  }
}
