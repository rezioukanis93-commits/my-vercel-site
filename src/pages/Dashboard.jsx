import React, { useContext, useEffect, useState } from 'react'
import { BarChart3, ExternalLink, Link2, QrCode, Sparkles, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { supabase, APP_URL } from '../lib/supabase'
import { AppContext } from '../main'

function makeSlug(name, id){
  const base=(name||'elvra-user').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)
  return `${base || 'user'}-${id.slice(0,6)}`
}
export default function Dashboard(){
 const {session,t}=useContext(AppContext); const [profile,setProfile]=useState(null); const [stats,setStats]=useState({visits:0,clicks:0,top:[]}); const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(false)
 const load=async()=>{setLoading(true);let {data:p}=await supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle(); if(!p){const slug=makeSlug(session.user.user_metadata?.display_name || session.user.email?.split('@')[0],session.user.id); const {data:created}=await supabase.from('profiles').insert({id:session.user.id,display_name:session.user.user_metadata?.display_name||'Your Name',slug,bio:'',avatar_url:null,cover_url:null,accent:'#00D084',auto_color:true}).select().single();p=created} setProfile(p); const {data:s}=await supabase.rpc('get_profile_stats',{p_profile_id:session.user.id}); if(s?.[0])setStats({visits:s[0].visits||0,clicks:s[0].clicks||0,top:s[0].top_links||[]}); setLoading(false)}
 useEffect(()=>{load()},[session.user.id])
 const publicUrl=profile?`${APP_URL}/p/${profile.slug}`:'#'; const copy=async()=>{await navigator.clipboard.writeText(publicUrl);setCopied(true);setTimeout(()=>setCopied(false),1200)}
 return <Layout><main className="page"><div className="page-header"><div><div className="eyebrow">ELVRA / {t.dashboard.toUpperCase()}</div><h1>{t.welcome}</h1><p>{t.dashboardHint}</p></div><div className="header-actions"><button className="ghost-btn" onClick={copy}><Link2 size={17}/>{copied?t.copied:t.copyLink}</button>{profile&&<a className="primary-btn compact" href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/>{t.viewCard}</a>}</div></div>
 {loading?<div className="loading-card shimmer"/>:<>
 <div className="stats-grid"><StatCard label={t.visits} value={stats.visits} note="All-time tracked" icon={<Users size={18}/>} /><StatCard label={t.clicks} value={stats.clicks} note="All link interactions" icon={<TrendingUp size={18}/>} /><StatCard label={t.topLinks} value={stats.top.length} note="Tracked destinations" icon={<BarChart3 size={18}/>} /></div>
 <div className="dashboard-grid"><section className="hero-card"><div className="hero-bg"/><div className="hero-inner"><div className="pill"><Sparkles size={14}/> ELVRA DIGITAL CARD</div><h2>{profile?.display_name || 'Your card'}<br/><span>lives at</span> <b>/p/{profile?.slug}</b></h2><p>{profile?.bio || t.subtitle}</p><div className="hero-actions"><Link to="/profile" className="primary-btn">{t.edit}<ExternalLink size={17}/></Link><Link to="/analytics" className="ghost-btn"><BarChart3 size={17}/>{t.analytics}</Link></div></div></section>
 <section className="mini-card"><div className="section-top"><span>{t.recentActivity}</span><Link to="/analytics">{t.viewCard}</Link></div><div className="empty-activity"><div className="mini-ring"><span>EL</span></div><h3>{stats.visits+stats.clicks===0?'Start sharing your card':'Live data is connected'}</h3><p>{stats.visits+stats.clicks===0?t.noData:'Your counters are read from Supabase event data.'}</p></div></section>
 <section className="quick-card"><div className="section-top"><span>{t.qr}</span><Link to="/profile">{t.download}</Link></div><div className="qr-preview"><QrCode size={48}/><div><b>Personal QR</b><span>Opens your live ELVRA card</span></div></div></section>
 </div></>}
 </main></Layout>
}
