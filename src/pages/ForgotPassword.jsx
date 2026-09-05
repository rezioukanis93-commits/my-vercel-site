import React, { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { supabase, APP_URL } from '../lib/supabase'
import { AppContext } from '../main'
import Toast from '../components/Toast'

export default function ForgotPassword() {
  const { t, lang, setLang } = useContext(AppContext)
  const [email,setEmail]=useState(''); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false); const [error,setError]=useState('')
  const submit=async e=>{e.preventDefault();setBusy(true);setError(''); const {error:err}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${APP_URL}/update-password`}); if(err)setError(err.message); else setDone(true);setBusy(false)}
  return <div className="auth-page single"><div className="auth-panel full"><div className="auth-top"><Link to="/" className="brand"><span className="brand-orb">E</span>ELVRA</Link><div className="segmented"><button onClick={()=>setLang('en')} className={lang==='en'?'sel':''}>EN</button><button onClick={()=>setLang('fr')} className={lang==='fr'?'sel':''}>FR</button><button onClick={()=>setLang('ar')} className={lang==='ar'?'sel':''}>AR</button></div></div><div className="auth-content narrow"><Link to="/login" className="back-link"><ArrowLeft size={16}/> {t.login}</Link><div className="eyebrow">ELVRA / RECOVERY</div><h1>{t.reset}</h1><p>We will email a secure recovery link to your account.</p><form className="form-stack" onSubmit={submit}><label>{t.email}<div className="input-wrap"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><span className="input-icon"><Mail size={18}/></span></div></label><button className="primary-btn" disabled={busy}>{busy?'...':t.sendReset}<ArrowLeft className="rotate-180" size={18}/></button></form>{done&&<div className="success-box">{t.resetSent}</div>}<Toast message={error} type="error"/></div></div></div>
}
