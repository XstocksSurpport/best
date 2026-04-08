import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useWallet } from './hooks/useWallet'
import { getPresaleProgress, getPresaleDeadline, formatDeadline } from './utils/presaleProgress'
import { isPresaleConfigured } from './config/presale'
import type { Language } from './i18n'
import { languages } from './i18n'

const TOKEN_RATE = 100 // 1 USDT = 100 BEST
const MIN_USDT = 288
const USDT_DECIMALS = 18

function App() {
  const { t, i18n } = useTranslation()
  const {
    address,
    chainId,
    chainName,
    isConnected,
    isCorrectChain,
    isConnecting,
    connect,
    disconnect,
    switchToBNB,
    participatePresale,
    getUSDTBalance,
    error,
  } = useWallet()

  const [presaleAmount, setPresaleAmount] = useState('')
  const [progress, setProgress] = useState(99.46)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [presaleError, setPresaleError] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null)
  const [balanceRefresh, setBalanceRefresh] = useState(0)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinSurname, setJoinSurname] = useState('')
  const [joinGivenName, setJoinGivenName] = useState('')
  const [joinContact, setJoinContact] = useState('')
  const [joinEmail, setJoinEmail] = useState('')
  const [joinFormError, setJoinFormError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    if (!joinOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setJoinOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [joinOpen])

  const closeJoinModal = () => {
    setJoinOpen(false)
    setJoinFormError(null)
    setJoinSuccess(false)
  }

  const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

  const handleJoinSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setJoinFormError(null)
    const sn = joinSurname.trim()
    const gn = joinGivenName.trim()
    const ct = joinContact.trim()
    const em = joinEmail.trim()
    if (!sn) {
      setJoinFormError(t('joinUs.required'))
      return
    }
    if (!gn) {
      setJoinFormError(t('joinUs.required'))
      return
    }
    if (!ct) {
      setJoinFormError(t('joinUs.required'))
      return
    }
    if (!em) {
      setJoinFormError(t('joinUs.required'))
      return
    }
    if (!emailOk(em)) {
      setJoinFormError(t('joinUs.invalidEmail'))
      return
    }
    setJoinSuccess(true)
    setJoinSurname('')
    setJoinGivenName('')
    setJoinContact('')
    setJoinEmail('')
  }

  const trimmedAmount = presaleAmount.trim()
  const parsedAmount = trimmedAmount === '' ? 0 : parseFloat(presaleAmount)
  const amountNum = Number.isFinite(parsedAmount) ? parsedAmount : 0
  const isValidAmount =
    (trimmedAmount === '' || Number.isFinite(parsedAmount)) && amountNum >= MIN_USDT
  const tokenAmount = isValidAmount ? Math.floor(amountNum * TOKEN_RATE) : 0
  const presaleReady = isPresaleConfigured()

  useEffect(() => {
    const update = () => setProgress(getPresaleProgress())
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isConnected || !getUSDTBalance) return
    if (chainId !== 56) {
      setUsdtBalance('-')
      return
    }
    setUsdtBalance(null)
    getUSDTBalance()
      .then((b) => {
        const n = Number(b) / 10 ** USDT_DECIMALS
        setUsdtBalance(n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      })
      .catch(() => setUsdtBalance('-'))
  }, [isConnected, address, chainId, getUSDTBalance, balanceRefresh])

  const handleParticipate = async () => {
    if (!isConnected) {
      try {
        await connect()
      } catch {
        // error set in hook
      }
      return
    }
    if (!isCorrectChain) {
      try {
        await switchToBNB()
      } catch {
        setPresaleError(t('wallet.wrongNetwork'))
      }
      return
    }
    if (!isValidAmount) {
      setPresaleError(t('errors.minAmount'))
      return
    }
    try {
      setIsSubmitting(true)
      setPresaleError(null)
      const amountWei = BigInt(Math.floor(amountNum * 10 ** USDT_DECIMALS))
      await participatePresale(amountWei)
      setPresaleAmount('')
      setPresaleError(null)
      setBalanceRefresh((r) => r + 1)
    } catch (e: unknown) {
      setPresaleError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const deadline = getPresaleDeadline()
  const locale = i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ja' ? 'ja-JP' : i18n.language

  useEffect(() => {
    document.title = t('meta.pageTitle')
  }, [i18n.language, t])

  return (
    <div className="app">
      <header className="header">
        <a href="#" className="logo">
          <img src="https://picui.ogmua.cn/s1/2026/04/08/69d5e8e0d02ff.webp" alt="BEST" width={48} height={48} />
          <div className="logo-text">
            <span className="logo-symbol">$BEST</span>
            <span className="logo-slogan">{t('meta.slogan')}</span>
          </div>
        </a>
        <nav className="nav">
          <div className="lang-dropdown" ref={langRef}>
            <button className="lang-btn" onClick={() => setLangOpen(!langOpen)}>
              {languages[i18n.language as Language]?.name || 'Language'} ▾
            </button>
            {langOpen && (
              <div className="lang-menu">
                {(Object.keys(languages) as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      i18n.changeLanguage(l)
                      setLangOpen(false)
                    }}
                  >
                    {languages[l].name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!isConnected ? (
            <button
              className="wallet-btn"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? '...' : t('wallet.connect')}
            </button>
          ) : (
            <div className="wallet-info">
              {chainName && (
                <span className="wallet-chain" title={t('wallet.chain')}>
                  {chainName}
                </span>
              )}
              {usdtBalance !== null && (
                <span className="wallet-balance" title={t('wallet.usdtBalance')}>
                  {usdtBalance} USDT
                </span>
              )}
              <span className="wallet-address">{shortAddress}</span>
              {!isCorrectChain ? (
                <button className="wallet-btn warning" onClick={switchToBNB}>
                  {t('wallet.switchNetwork')}
                </button>
              ) : null}
              <button className="wallet-btn disconnect" onClick={disconnect}>
                {t('wallet.disconnect')}
              </button>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <h1>{t('hero.title')}</h1>
          <p>{t('hero.description')}</p>
        </section>

        <section className="presale">
          <h2>{t('presale.title')}</h2>
          <div className="presale-card">
            <div className="progress-row">
              <span>{t('presale.progress')}</span>
              <span className="deadline">
                {t('presale.deadline')}: {formatDeadline(deadline, locale)}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className="progress-value">{progress.toFixed(2)}%</p>

            <div className="presale-info">
              <div className="info-row">
                <span>{t('presale.price')}</span>
                <span>{t('presale.priceValue')}</span>
              </div>
              <div className="info-row">
                <span>{t('presale.totalAllocation')}</span>
                <span>{t('presale.totalValue')}</span>
              </div>
              <div className="info-row">
                <span>{t('presale.chain')}</span>
                <span>{t('presale.chainValue')}</span>
              </div>
            </div>

            <div className="presale-form">
              <label>{t('presale.amount')}</label>
              <input
                type="number"
                min={MIN_USDT}
                step="any"
                value={presaleAmount}
                onChange={(e) => setPresaleAmount(e.target.value)}
                placeholder={t('presale.minAmount')}
              />
              <label>{t('presale.receive')}</label>
              <div className="receive-display">
                {tokenAmount.toLocaleString()} $BEST
              </div>
              {!presaleReady && <p className="error">{t('errors.presaleNotConfigured')}</p>}
              {presaleError && <p className="error">{presaleError}</p>}
              <button
                className="participate-btn"
                onClick={handleParticipate}
                disabled={isSubmitting || (isConnected && isCorrectChain && (!isValidAmount || !presaleReady))}
              >
                {!isConnected
                  ? t('presale.connectWallet')
                  : !isCorrectChain
                    ? t('wallet.switchNetwork')
                    : isSubmitting
                      ? '...'
                      : t('presale.participate')}
              </button>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>{t('tokenFunctions.title')}</h2>
          <ul>
            <li>{t('tokenFunctions.governance')}</li>
            <li>{t('tokenFunctions.events')}</li>
            <li>{t('tokenFunctions.staking')}</li>
            <li>{t('tokenFunctions.empower')}</li>
            <li>{t('tokenFunctions.connect')}</li>
          </ul>
        </section>

        <section className="section">
          <h2>{t('tokenomics.title')}</h2>
          <div className="tokenomics-grid">
            <div><strong>{t('tokenomics.name')}</strong><span>{t('tokenomics.nameValue')}</span></div>
            <div><strong>{t('tokenomics.symbol')}</strong><span>{t('tokenomics.symbolValue')}</span></div>
            <div><strong>{t('tokenomics.supply')}</strong><span>{t('tokenomics.supplyValue')}</span></div>
            <div><strong>{t('tokenomics.chain')}</strong><span>{t('tokenomics.chainValue')}</span></div>
            <div><strong>{t('tokenomics.liquidity')}</strong><span>{t('tokenomics.liquidityValue')}</span></div>
          </div>
          <h3>{t('tokenomics.allocation')}</h3>
          <ul className="allocation-list">
            <li><strong>{t('tokenomics.community')}</strong> — {t('tokenomics.communityDesc')}</li>
            <li><strong>{t('tokenomics.liquidityPool')}</strong> — {t('tokenomics.liquidityPoolDesc')}</li>
            <li><strong>{t('tokenomics.team')}</strong> — {t('tokenomics.teamDesc')}</li>
            <li><strong>{t('tokenomics.marketing')}</strong> — {t('tokenomics.marketingDesc')}</li>
            <li><strong>{t('tokenomics.treasury')}</strong> — {t('tokenomics.treasuryDesc')}</li>
          </ul>
        </section>

        <section className="section">
          <h2>{t('utility.title')}</h2>
          <ul>
            <li>{t('utility.governance')}</li>
            <li>{t('utility.staking')}</li>
            <li>{t('utility.events')}</li>
            <li>{t('utility.discount')}</li>
            <li>{t('utility.partners')}</li>
          </ul>
        </section>

        <section className="section">
          <h2>{t('deflation.title')}</h2>
          <ul>
            <li>{t('deflation.tax')}</li>
            <li>{t('deflation.buyback')}</li>
            <li>{t('deflation.effect')}</li>
          </ul>
        </section>

        <section className="section">
          <h2>{t('roadmap.title')}</h2>
          <ul className="roadmap">
            <li>{t('roadmap.q1')}</li>
            <li>{t('roadmap.q2')}</li>
            <li>{t('roadmap.q3')}</li>
            <li>{t('roadmap.q4')}</li>
          </ul>
        </section>

        <section className="section partners">
          <h2>{t('partners.title')}</h2>
          <p className="gold-sponsor">{t('partners.goldSponsor')}: {t('partners.goldSponsors')}</p>
          <div className="partner-logos">
            <span>GAT Bank</span>
            <span>MooreLabs</span>
            <span>Valor</span>
            <span>VITAKING</span>
            <span>Talking Web3</span>
            <span>OTalk</span>
            <span>PG Protocol</span>
          </div>
        </section>
      </main>

      <div className="join-bar">
        <button type="button" className="join-open-btn" onClick={() => setJoinOpen(true)}>
          {t('joinUs.cta')}
        </button>
      </div>

      {joinOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={closeJoinModal}
        >
          <div
            className="join-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="join-modal-head">
              <h2 id="join-modal-title">{t('joinUs.title')}</h2>
              <button type="button" className="join-modal-close" onClick={closeJoinModal} aria-label={t('joinUs.close')}>
                ×
              </button>
            </div>
            {joinSuccess ? (
              <p className="join-success">{t('joinUs.success')}</p>
            ) : (
              <form className="join-form" onSubmit={handleJoinSubmit}>
                <label htmlFor="join-surname">{t('joinUs.surname')}</label>
                <input
                  id="join-surname"
                  name="surname"
                  autoComplete="family-name"
                  value={joinSurname}
                  onChange={(e) => setJoinSurname(e.target.value)}
                />
                <label htmlFor="join-given">{t('joinUs.givenName')}</label>
                <input
                  id="join-given"
                  name="givenName"
                  autoComplete="given-name"
                  value={joinGivenName}
                  onChange={(e) => setJoinGivenName(e.target.value)}
                />
                <label htmlFor="join-contact">{t('joinUs.contact')}</label>
                <input
                  id="join-contact"
                  name="contact"
                  autoComplete="tel"
                  value={joinContact}
                  onChange={(e) => setJoinContact(e.target.value)}
                />
                <label htmlFor="join-email">{t('joinUs.email')}</label>
                <input
                  id="join-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={joinEmail}
                  onChange={(e) => setJoinEmail(e.target.value)}
                />
                {joinFormError && <p className="join-form-error">{joinFormError}</p>}
                <button type="submit" className="join-submit-btn">
                  {t('joinUs.submit')}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {error && <div className="toast error">{error}</div>}

      <style>{`
        .app { min-height: 100vh; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background: rgba(0,0,0,0.2);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo { display: flex; align-items: center; gap: 0.75rem; font-weight: bold; }
        .logo-text { display: flex; flex-direction: column; gap: 0.1rem; }
        .logo-symbol { font-size: 1.25rem; }
        .logo-slogan { font-size: 0.7rem; font-weight: 400; opacity: 0.9; }
        .logo img { border-radius: 8px; }
        .nav { display: flex; align-items: center; gap: 1rem; }
        .lang-dropdown { position: relative; }
        .lang-btn {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.5);
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }
        .lang-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: #2a0a0a;
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          overflow: hidden;
          min-width: 120px;
        }
        .lang-menu button {
          display: block;
          width: 100%;
          padding: 0.5rem 1rem;
          background: none;
          color: #fff;
          border: none;
          text-align: left;
        }
        .lang-menu button:hover { background: rgba(255,255,255,0.1); }
        .wallet-btn {
          background: #000;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
        }
        .wallet-btn:hover:not(:disabled) { opacity: 0.9; }
        .wallet-btn.connected { background: #1a472a; }
        .wallet-btn.warning { background: #8b4513; }
        .wallet-btn.disconnect { background: #5c1a1a; font-size: 0.85rem; }
        .wallet-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .wallet-chain { font-size: 0.8rem; opacity: 0.9; }
        .wallet-balance { font-size: 0.85rem; font-weight: 600; }
        .wallet-address { font-size: 0.85rem; opacity: 0.9; }

        main { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .hero { text-align: center; padding: 3rem 0; }
        .hero h1 { font-size: 1.75rem; margin-bottom: 1rem; line-height: 1.4; }
        .hero p { font-size: 1rem; line-height: 1.7; opacity: 0.95; }

        .presale { margin: 3rem 0; }
        .presale h2 { text-align: center; margin-bottom: 1.5rem; }
        .presale-card {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 2rem;
        }
        .progress-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .deadline { color: #ffd700; font-weight: 600; }
        .progress-bar {
          height: 12px;
          background: rgba(255,255,255,0.2);
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b0000, #ff4500);
          transition: width 0.3s;
        }
        .progress-value { font-size: 1.25rem; font-weight: bold; margin-bottom: 1.5rem; }
        .presale-info { margin-bottom: 1.5rem; }
        .info-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .presale-form label { display: block; margin-top: 1rem; margin-bottom: 0.25rem; }
        .presale-form input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
        }
        .presale-form input::placeholder { color: rgba(255,255,255,0.5); }
        .receive-display {
          padding: 0.75rem;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
        }
        .presale-form .error { color: #ff6b6b; margin-top: 0.5rem; font-size: 0.9rem; }
        .participate-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 1rem;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
        }
        .participate-btn:hover:not(:disabled) { opacity: 0.9; }
        .participate-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .section { margin: 3rem 0; }
        .section h2 { margin-bottom: 1rem; font-size: 1.5rem; }
        .section h3 { margin: 1.5rem 0 0.5rem; font-size: 1.1rem; }
        .section ul { list-style: none; }
        .section li { padding: 0.5rem 0; padding-left: 1rem; border-left: 3px solid rgba(255,255,255,0.3); margin-bottom: 0.5rem; }
        .tokenomics-grid { display: grid; gap: 0.75rem; margin-bottom: 1rem; }
        .tokenomics-grid div { display: flex; justify-content: space-between; }
        .allocation-list li { margin-bottom: 0.75rem; }
        .roadmap li { font-size: 1rem; }
        .partners .gold-sponsor { color: #ffd700; font-weight: 600; margin-bottom: 1rem; }
        .partner-logos {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .partner-logos span {
          padding: 0.5rem 1rem;
          background: rgba(0,0,0,0.3);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .join-bar {
          text-align: center;
          padding: 2rem 1rem 3rem;
          border-top: 1px solid rgba(255,255,255,0.2);
        }
        .join-open-btn {
          background: #000;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.35);
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .join-open-btn:hover { opacity: 0.9; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1rem;
        }
        .join-modal {
          background: #2a0a0a;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 420px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .join-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .join-modal-head h2 { margin: 0; font-size: 1.25rem; }
        .join-modal-close {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0 0.25rem;
          opacity: 0.85;
        }
        .join-modal-close:hover { opacity: 1; }
        .join-form label {
          display: block;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }
        .join-form input {
          width: 100%;
          padding: 0.65rem 0.75rem;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          box-sizing: border-box;
        }
        .join-form-error { color: #ff6b6b; margin-top: 0.75rem; font-size: 0.9rem; margin-bottom: 0; }
        .join-submit-btn {
          width: 100%;
          margin-top: 1.25rem;
          padding: 0.85rem;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .join-submit-btn:hover { opacity: 0.9; }
        .join-success { margin: 0.5rem 0 0; line-height: 1.6; }

        .toast {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 1rem 2rem;
          background: #8b0000;
          border-radius: 8px;
          z-index: 1000;
        }
        .toast.error { background: #8b0000; }
      `}</style>
    </div>
  )
}

export default App
