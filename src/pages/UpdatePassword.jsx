import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppContext } from '../main'

export default function UpdatePassword(){
 const {t}=useContext(AppContext); const nav=useNavigate(); const [p,setP]=useState(''); const [c,setC]=useState(''); const [msg,setMsg]=useState(''); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false)
 const submit=async e=>{e.preventDefault();if(p!==c)return setErr('Passwords do not match.');setBusy(true);setErr('');const {error}=await supabase.auth.updateUser({password:p});if(error)setErr(error.message);else{setMsg(t.passwordUpdated);setTimeout(()=>nav('/'),900)}setBusy(false)}
 return <div className="auth-page single"><div className="auth-panel full"><div className="auth-top"><Link to="/" className="brand"><span className="brand-orb">E</span>ELVRA</Link></div><div className="auth-content narrow"><div className="eyebrow">ELVRA / PASSWORD</div><h1>{t.changePassword}</h1><p>Choose a strong password you will remember.</p><form className="form-stack" onSubmit={submit}><label>{t.newPassword}<input type="password" minLength="6" required value={p} onChange={e=>setP(e.target.value)} /></label><label>{t.confirmPassword}<input type="password" minLength="6" required value={c} onChange={e=>setC(e.target.value)} /></label><button className="primary-btn" disabled={busy}>{busy?'...':t.updatePassword}<CheckCircle2 size={18}/></button></form>{msg&&<div className="success-box">{msg}</div>}{err&&<div className="error-box">{err}</div>}</div></div></div>
}
