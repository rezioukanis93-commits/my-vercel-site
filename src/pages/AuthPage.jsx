import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppContext } from '../main'
import Toast from '../components/Toast'

export default function AuthPage({ mode }) {
  const { t, lang, setLang } = useContext(AppContext)
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        nav('/')
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (err) throw err
        nav('/')
      }
    } catch (err) { setError(err.message || 'Something went wrong.') } finally { setBusy(false) }
  }
  return <div className="auth-page">
    <div className="auth-art"><div className="grain"/><div className="art-orb"/><div className="auth-logo">ELVRA</div><div className="art-title">Your identity.<br/><em>One elegant link.</em></div><div className="art-foot">BUILD • SHARE • GROW</div></div>
    <div className="auth-panel">
      <div className="auth-top"><Link to="/" className="brand"><span className="brand-orb">E</span>ELVRA</Link><div className="segmented"><button onClick={() => setLang('en')} className={lang==='en'?'sel':''}>EN</button><button onClick={() => setLang('fr')} className={lang==='fr'?'sel':''}>FR</button><button onClick={() => setLang('ar')} className={lang==='ar'?'sel':''}>AR</button></div></div>
      <div className="auth-content"><div className="eyebrow">ELVRA / {mode === 'login' ? 'ACCESS' : 'CREATE'}</div><h1>{mode === 'login' ? t.login : t.signup}</h1><p>{t.subtitle}</p>
      <form onSubmit={submit} className="form-stack">{mode === 'signup' && <label>{t.name}<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Alex Morgan"/></label>}<label>{t.email}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>{t.passwordLabel}<div className="input-wrap"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength="6" placeholder="••••••••"/><button type="button" className="input-action" onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>{mode==='login' && <div className="form-line"><Link to="/forgot-password">{t.forgot}</Link><span>6+ chars</span></div>}<button className="primary-btn" disabled={busy}>{busy ? '...' : (mode==='login'?t.login:t.signup)}<ArrowRight size={18}/></button></form>
      <div className="auth-switch">{mode==='login'?t.noAccount:t.already} <Link to={mode==='login'?'/signup':'/login'}>{mode==='login'?t.signup:t.login}</Link></div><div className="secure-note"><ShieldCheck size={16}/>{t.secure}</div><Toast message={error} type="error"/></div>
    </div>
  </div>
}
