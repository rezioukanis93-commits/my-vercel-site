import React, { useContext, useEffect, useState } from 'react'
import { Activity, ArrowUpRight, BarChart3, MousePointer2, Users } from 'lucide-react'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'
import { AppContext } from '../main'

export default function Analytics(){
  const {session,t}=useContext(AppContext)
  const [stats,setStats]=useState({visits:0,clicks:0,top_links:[]})
  const [events,setEvents]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const load=async()=>{
    setLoading(true); setError('')
    try{
      const {data:s,error:sErr}=await supabase.rpc('get_profile_stats',{p_profile_id:session.user.id})
      if(sErr) throw sErr
      const row=s?.[0]||{visits:0,clicks:0,top_links:[]}
      setStats({visits:Number(row.visits||0),clicks:Number(row.clicks||0),top_links:row.top_links||[]})
      const {data:e,error:eErr}=await supabase.from('analytics_events').select('id,event_type,created_at,link:profile_links(title,type)').eq('profile_id',session.user.id).order('created_at',{ascending:false}).limit(20)
      if(eErr) throw eErr
      setEvents(e||[])
    }catch(err){ setError(err.message||'Analytics could not be loaded.') }
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[session.user.id])
  const top=stats.top_links||[]
  return <Layout><main className="page"><div className="page-header"><div><div className="eyebrow">ELVRA / ANALYTICS</div><h1>{t.analyticsTitle}</h1><p>Visits and link clicks are counted from real Supabase events.</p></div><div className="live-badge"><span className="live-dot"/> LIVE DATA</div></div>
    {error&&<div className="error-box analytics-error">{error}</div>}
    {loading?<div className="loading-card shimmer"/>:<><div className="stats-grid"><StatCard label={t.visits} value={stats.visits} note="Recorded page views" icon={<Users size={18}/>} /><StatCard label={t.clicks} value={stats.clicks} note="Recorded link clicks" icon={<MousePointer2 size={18}/>} /><StatCard label="CTR" value={stats.visits?`${Math.round((stats.clicks/stats.visits)*100)}%`:'0%'} note="Clicks per 100 visits" icon={<BarChart3 size={18}/>} /></div>
    <div className="analytics-grid"><section className="panel"><div className="section-title"><span>{t.topLinks}</span><ArrowUpRight size={16}/></div>{top.length===0?<div className="empty-state"><Activity size={25}/><b>{t.noData}</b><span>When a visitor clicks a link, it appears here.</span></div>:<div className="top-list">{top.map((x,i)=><div className="top-row" key={x.id||i}><span className="rank">0{i+1}</span><div className="top-main"><b>{x.title}</b><span>{x.type}</span></div><strong>{Number(x.clicks||0)}</strong></div>)}</div>}</section>
    <section className="panel"><div className="section-title"><span>{t.recentActivity}</span><span className="muted">20 max</span></div>{events.length===0?<div className="empty-state"><span>No recorded events yet.</span></div>:<div className="activity-list">{events.map(e=><div className="activity-row" key={e.id}><span className="activity-type">{e.event_type}</span><span>{e.link?.title||'Page visit'}</span><time>{new Date(e.created_at).toLocaleString()}</time></div>)}</div>}</section></div></>}
  </main></Layout>
}
