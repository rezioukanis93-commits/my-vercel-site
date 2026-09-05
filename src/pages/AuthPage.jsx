import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppContext } from '../main'
import Toast from '../components/Toast'

export default function AuthPage({ mode }) {
  const { t, lang, setLang } = useContext(AppContext)
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setCreated(false)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
        nav('/')
      } else {
        const cleanUsername = username.trim().toLowerCase()
        if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/.test(cleanUsername)) {
          throw new Error(t.usernameRule)
        }
        if (password !== confirmPassword) throw new Error(t.passwordMismatch)
        if (password.length < 6) throw new Error(t.passwordMin)

        const { data: available, error: availabilityError } = await supabase.rpc('is_username_available', { p_username: cleanUsername })
        if (availabilityError) throw availabilityError
        if (!available) throw new Error(t.usernameTaken)

        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername, display_name: name.trim() || cleanUsername } },
        })
        if (err) throw err
        if (data.session) nav('/')
        else setCreated(true)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page">
    <div className="auth-art">
      <div className="grain"/><div className="art-orb"/>
      <img className="auth-logo-img" src="/elvra-logo.png" alt="ELVRA" />
      <div className="art-title">Your identity.<br/><em>One elegant link.</em></div>
      <div className="art-foot">BUILD • SHARE • GROW</div>
    </div>
    <div className="auth-panel">
      <div className="auth-top">
        <Link to="/" className="brand"><img src="/elvra-logo.png" alt="ELVRA"/><span>ELVRA</span></Link>
        <div className="segmented"><button onClick={() => setLang('en')} className={lang==='en'?'sel':''}>EN</button><button onClick={() => setLang('fr')} className={lang==='fr'?'sel':''}>FR</button><button onClick={() => setLang('ar')} className={lang==='ar'?'sel':''}>AR</button></div>
      </div>
      <div className="auth-content">
        <div className="eyebrow">ELVRA / {mode === 'login' ? 'ACCESS' : 'CREATE'}</div>
        <h1>{mode === 'login' ? t.login : t.signup}</h1>
        <p>{mode === 'login' ? t.subtitle : t.signupSubtitle}</p>
        <form onSubmit={submit} className="form-stack">
          {mode === 'signup' && <>
            <label>{t.username}<input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))} required autoComplete="username" minLength="3" maxLength="30" placeholder="yourname" /></label>
            <label>{t.name}<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" /></label>
          </>}
          <label>{t.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>
          <label>{t.passwordLabel}<div className="input-wrap"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength="6" autoComplete={mode==='login'?'current-password':'new-password'} placeholder="••••••••"/><button type="button" className="input-action" onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
          {mode==='signup' && <label>{t.confirmPassword}<div className="input-wrap"><input type={showConfirm?'text':'password'} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength="6" autoComplete="new-password" placeholder="••••••••"/><button type="button" className="input-action" onClick={()=>setShowConfirm(!showConfirm)}>{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>}
          {mode==='login' && <div className="form-line"><Link to="/forgot-password">{t.forgot}</Link><span>6+ chars</span></div>}
          <button className="primary-btn auth-submit" disabled={busy}>{busy ? '...' : (mode==='login'?t.login:t.signup)}<ArrowRight size={18}/></button>
        </form>
        {created && <div className="success-box auth-success"><CheckCircle2 size={16}/><span>{t.checkEmail}</span></div>}
        <div className="auth-switch">{mode==='login'?t.noAccount:t.already} <Link to={mode==='login'?'/signup':'/login'}>{mode==='login'?t.signup:t.login}</Link></div>
        <div className="secure-note"><ShieldCheck size={16}/>{t.secure}</div>
        <Toast message={error} type="error"/>
      </div>
    </div>
  </div>
}
