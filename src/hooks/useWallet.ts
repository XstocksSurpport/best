import { useState, useEffect, useCallback, useRef } from 'react'
import { useLogin, usePrivy, useWallets } from '@privy-io/react-auth'
import { BrowserProvider, Contract, JsonRpcSigner, Interface } from 'ethers'
import { getPresaleTreasuryAddress, USDT_BSC_ADDRESS } from '../config/presale'
import {
  BNB_WALLET_CHAIN_PARAMS,
  getDisplayChainName,
  isBnbWalletChain,
} from '../config/chains'
import {
  BNB_MAINNET_CHAIN_ID,
  getStakingContractAddress,
  isClaimChain,
  STAKE_BNB_WEI,
} from '../config/staking'

const BNB_CHAIN_ID = BNB_MAINNET_CHAIN_ID

export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  56: 'BNB Chain',
  97: 'BSC Testnet',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  43114: 'Avalanche',
}

const BNB_CHAIN_PARAMS = BNB_WALLET_CHAIN_PARAMS.mainnet

const USDT_BSC = USDT_BSC_ADDRESS

/** 与 djdog312 CONFIG.GAS_LIMIT_TRANSFER 一致 */
const GAS_LIMIT_TRANSFER = 100000n

/** claim() 固定 gas，避免 ethers 发交易前 RPC estimateGas（余额不足时会提前失败、弹不出钱包） */
const GAS_LIMIT_CLAIM = 80_000n

const STAKING_ABI = ['function claim() external payable'] as const

const USDT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

/** 链切换等事件可能连续触发，合并为一次刷新 */
const CHAIN_EVENT_DEBOUNCE_MS = 150

const WALLETS_READY_TIMEOUT_MS = 8000
const WALLETS_READY_POLL_MS = 50
const CONNECTION_RETRY_MS = 100
const CONNECTION_RETRY_MAX = 30
const LOGIN_TIMEOUT_MS = 20000

type PrivyConnectedWallet = ReturnType<typeof useWallets>['wallets'][number]

type WalletConnection = {
  address: string
  chainId: number
  signer: JsonRpcSigner
  eip1193: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  }
}

function getInjectedEip1193(): WalletConnection['eip1193'] | null {
  const injected =
    // OKX Wallet inject
    (window as unknown as { okxwallet?: unknown }).okxwallet ??
    // MetaMask / other EIP-1193
    (window as unknown as { ethereum?: unknown }).ethereum
  const eip1193 = injected as WalletConnection['eip1193'] | undefined
  return eip1193?.request ? eip1193 : null
}

async function switchWalletToBNB(
  eip1193: WalletConnection['eip1193'],
): Promise<void> {
  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BNB_CHAIN_PARAMS.chainId }],
    })
  } catch (e: unknown) {
    try {
      await eip1193.request({
        method: 'wallet_addEthereumChain',
        params: [BNB_CHAIN_PARAMS],
      })
    } catch {
      throw e
    }
  }
}

/** Privy wallets 按「最近连接 → 最早连接」排序，取用户刚连上的钱包 */
function pickActiveWallet(
  walletList: PrivyConnectedWallet[],
  preferredAddress?: string | null,
): PrivyConnectedWallet | null {
  if (!walletList.length) return null

  if (preferredAddress) {
    const preferred = walletList.find(
      (w) => w.address.toLowerCase() === preferredAddress.toLowerCase(),
    )
    if (preferred) return preferred
  }

  const external = walletList.find((w) => w.walletClientType !== 'privy')
  if (external) return external

  return walletList[0]
}

export function useWallet() {
  const { ready, authenticated, logout } = usePrivy()
  const lastConnectedAddressRef = useRef<string | null>(null)
  const injectedConnectedRef = useRef(false)
  const walletsRef = useRef<PrivyConnectedWallet[]>([])
  const walletsReadyRef = useRef(false)

  const { login } = useLogin({
    onComplete: ({ linkedAccount, loginMethod }) => {
      if (loginMethod === 'siwe' && linkedAccount?.type === 'wallet' && linkedAccount.address) {
        lastConnectedAddressRef.current = linkedAccount.address
      }
    },
  })

  const { wallets, ready: walletsReady } = useWallets()
  walletsRef.current = wallets
  walletsReadyRef.current = walletsReady

  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshInFlight = useRef(false)
  const chainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLocalConnection = useCallback(() => {
    lastConnectedAddressRef.current = null
    injectedConnectedRef.current = false
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setChainId(null)
    setError(null)
  }, [])

  const waitForWalletsReady = useCallback(async () => {
    const deadline = Date.now() + WALLETS_READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (walletsReadyRef.current && walletsRef.current.length > 0) return true
      await new Promise((resolve) => setTimeout(resolve, WALLETS_READY_POLL_MS))
    }
    return walletsReadyRef.current && walletsRef.current.length > 0
  }, [])

  const syncWalletConnection = useCallback(async (): Promise<WalletConnection | null> => {
    if (!ready || !authenticated || !walletsReadyRef.current) {
      if (!ready || !authenticated) clearLocalConnection()
      return null
    }

    const walletList = walletsRef.current
    const activeWallet = pickActiveWallet(walletList, lastConnectedAddressRef.current)
    if (!activeWallet) {
      clearLocalConnection()
      return null
    }

    const eip1193 = await activeWallet.getEthereumProvider()
    const prov = new BrowserProvider(eip1193)
    const sig = await prov.getSigner(activeWallet.address)
    const network = await prov.getNetwork()
    const addr = (await sig.getAddress()).toLowerCase()
    const walletAddr = activeWallet.address.toLowerCase()
    if (addr !== walletAddr) {
      setError('Connected wallet mismatch. Please reconnect.')
      clearLocalConnection()
      return null
    }

    lastConnectedAddressRef.current = addr
    setProvider(prov)
    setSigner(sig)
    setAddress(addr)
    const cId = Number(network.chainId)
    setChainId(cId)
    return { address: addr, chainId: cId, signer: sig, eip1193 }
  }, [ready, authenticated, clearLocalConnection])

  const waitForWalletConnection = useCallback(async (): Promise<WalletConnection | null> => {
    for (let i = 0; i < CONNECTION_RETRY_MAX; i++) {
      const conn = await syncWalletConnection()
      if (conn) return conn
      await new Promise((resolve) => setTimeout(resolve, CONNECTION_RETRY_MS))
    }
    return null
  }, [syncWalletConnection])

  const connectInjectedWallet = useCallback(async (): Promise<{ address: string; chainId: number }> => {
    const injected: unknown =
      // OKX Wallet
      (window as unknown as { okxwallet?: { ethereum?: unknown } }).okxwallet?.ethereum ??
      // MetaMask / other EIP-1193
      (window as unknown as { ethereum?: unknown }).ethereum

    const eip1193 = injected as WalletConnection['eip1193'] | undefined
    if (!eip1193?.request) throw new Error('未检测到浏览器钱包插件，请打开 OKX 钱包或安装钱包插件')

    const accounts = (await eip1193.request({ method: 'eth_requestAccounts' })) as string[]
    if (!accounts || accounts.length === 0) throw new Error('未获取到钱包地址')

    const prov = new BrowserProvider(eip1193)
    const sig = await prov.getSigner()
    const network = await prov.getNetwork()
    const addr = (await sig.getAddress()).toLowerCase()

    injectedConnectedRef.current = true
    lastConnectedAddressRef.current = addr
    setProvider(prov)
    setSigner(sig)
    setAddress(addr)
    setChainId(Number(network.chainId))
    setError(null)

    return { address: addr, chainId: Number(network.chainId) }
  }, [])

  /**
   * 从当前钱包重新拉取账户与链（不弹窗）。
   * 用于链切换、切账户、页签回到前台等，替代整页 reload。
   */
  const refreshConnection = useCallback(async (): Promise<{ address: string; chainId: number } | null> => {
    if (refreshInFlight.current) return null
    refreshInFlight.current = true
    try {
      const conn = await syncWalletConnection()
      if (!conn) return null
      return { address: conn.address, chainId: conn.chainId }
    } catch {
      return null
    } finally {
      refreshInFlight.current = false
    }
  }, [syncWalletConnection])

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)

      lastConnectedAddressRef.current = null
      await Promise.race([
        login({ loginMethods: ['wallet'] }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('连接超时：请在钱包弹窗中确认')),
            LOGIN_TIMEOUT_MS,
          ),
        ),
      ])

      const walletsOk = await waitForWalletsReady()
      if (!walletsOk) throw new Error('No account connected')

      const conn = await waitForWalletConnection()
      if (!conn) throw new Error('No account connected')
      return { address: conn.address, chainId: conn.chainId }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect'
      setError(msg)
      throw e
    } finally {
      setIsConnecting(false)
    }
  }, [login, waitForWalletsReady, waitForWalletConnection])

  const disconnect = useCallback(async () => {
    try {
      if (authenticated) await logout()
    } finally {
      clearLocalConnection()
    }
  }, [authenticated, logout, clearLocalConnection])

  const switchToBNB = useCallback(async () => {
    const eip1193 = provider?.provider
    if (!eip1193?.request) throw new Error('Wallet not connected')
    await switchWalletToBNB(eip1193)
    await syncWalletConnection()
  }, [provider, syncWalletConnection])

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

  const stakeBnb = useCallback(async () => {
    if (!signer || !address) throw new Error('Wallet not connected')
    if (!chainId || !isClaimChain(chainId)) throw new Error('Please switch to BNB Chain')
    const contractAddr = getStakingContractAddress(chainId)
    const iface = new Interface([...STAKING_ABI])
    const data = iface.encodeFunctionData('claim')
    const txRequest = {
      from: address,
      to: contractAddr,
      data,
      value: STAKE_BNB_WEI,
      gasLimit: GAS_LIMIT_CLAIM,
    }

    const eip1193 = signer.provider?.provider as
      | { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> }
      | undefined

    if (eip1193?.request) {
      const hash = (await eip1193.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: address,
            to: contractAddr,
            data,
            value: '0x' + STAKE_BNB_WEI.toString(16),
            gas: '0x' + GAS_LIMIT_CLAIM.toString(16),
          },
        ],
      })) as string
      const receipt = await signer.provider!.waitForTransaction(hash)
      if (!receipt || receipt.status === 0) throw new Error('Transaction failed')
      return
    }

    const tx = await signer.sendTransaction(txRequest)
    await tx.wait()
  }, [signer, address, chainId])

  /** 首次进入：若 Privy 会话仍在则静默恢复连接 */
  useEffect(() => {
    if (!walletsReady) return
    void refreshConnection()
  }, [walletsReady, refreshConnection])

  useEffect(() => {
    if (!walletsReady || !authenticated) return

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
  }, [wallets, walletsReady, authenticated, refreshConnection])

  return {
    address,
    chainId,
    chainName: getDisplayChainName(chainId),
    isConnected: !!address,
    isCorrectChain: chainId === BNB_CHAIN_ID,
    isClaimChain: isClaimChain(chainId),
    isBnbWalletChain: isBnbWalletChain(chainId),
    isConnecting,
    error,
    connect,
    disconnect,
    switchToBNB,
    participatePresale,
    stakeBnb,
    getUSDTBalance,
    refreshConnection,
  }
}
