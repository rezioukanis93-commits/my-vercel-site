import React, { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Instagram, Link2, Mail, MapPin, Phone, Share2, Globe2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const iconFor = t => ({ instagram:Instagram, phone:Phone, email:Mail, map:MapPin, website:Globe2 }[t] || Link2)

function hexToRgb(hex){
  const m=(hex||'').replace('#','').match(/^([0-9a-f]{6})$/i)
  if(!m)return {r:0,g:208,b:132}
  const n=parseInt(m[1],16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}
}

export default function PublicCard(){
  const {slug}=useParams();
  const [data,setData]=useState(null); const [error,setError]=useState(false)
  useEffect(()=>{
    let alive=true
    ;(async()=>{
      setError(false)
      const cleanSlug=decodeURIComponent(slug||'').trim().toLowerCase()
      const {data:d,error:e}=await supabase.rpc('get_public_profile',{p_slug:cleanSlug})
      if(e||!d?.length){ if(alive)setError(true); return }
      const p=d[0]
      const {data:links}=await supabase.rpc('get_public_links',{p_profile_id:p.id})
      if(!alive)return
      setData({...p,links:links||[]})
      // Do not block rendering on analytics. The RPC is SECURITY DEFINER and accepts anonymous visitors.
      void supabase.rpc('record_profile_event',{p_profile_id:p.id,p_event_type:'visit',p_link_id:null})
    })()
    return ()=>{alive=false}
  },[slug])

  const palette = useMemo(()=>{
    const accent=data?.accent||'#00D084'; const rgb=hexToRgb(accent)
    return {'--accent':accent,'--accent-rgb':`${rgb.r}, ${rgb.g}, ${rgb.b}`}
  },[data?.accent])

  const click = async (event,l) => {
    event.preventDefault()
    if(data?.id) await supabase.rpc('record_profile_event',{p_profile_id:data.id,p_event_type:'click',p_link_id:l.id})
    if(l.type==='phone' || l.type==='email') window.location.href=l.url
    else window.open(l.url,'_blank','noopener,noreferrer')
  }

  if(error)return <div className="public-error"><img src="/elvra-logo.png" alt="ELVRA"/><div><h1>404</h1><p>This ELVRA card could not be found.</p><a href="/login">Create your ELVRA card</a></div></div>
  if(!data)return <div className="boot"><div className="boot-mark"><img src="/elvra-logo.png" alt="ELVRA"/></div><div className="spinner" /></div>

  return <div className="public-page" style={palette}>
    <div className="public-orb one"/><div className="public-orb two"/>
    <div className="public-card">
      <div className="public-cover" style={{backgroundImage:data.cover_url?`url(${data.cover_url})`:undefined}}/>
      <div className="public-content">
        <div className="public-avatar">{data.avatar_url?<img src={data.avatar_url} alt=""/>:<span>{data.display_name?.slice(0,1)||'E'}</span>}</div>
        <div className="public-name-row"><div><div className="public-eyebrow">ELVRA DIGITAL CARD</div><h1>{data.display_name}</h1><div className="public-handle">@{data.username || data.slug}</div></div><button className="share-btn" onClick={async()=>{if(navigator.share)await navigator.share({title:data.display_name,url:location.href});else await navigator.clipboard.writeText(location.href)}}><Share2 size={18}/></button></div>
        {data.bio&&<p className="public-bio">{data.bio}</p>}
        <div className="public-meta">{data.location&&<span><MapPin size={14}/>{data.location}</span>}{data.website&&<a href={data.website.startsWith('http')?data.website:`https://${data.website}`} target="_blank" rel="noreferrer" onClick={(e)=>{ /* website clicks are intentionally tracked when represented as a profile link */ }}><ExternalLink size={14}/>Website</a>}</div>
        <div className="public-links">{data.links.map(l=>{const I=iconFor(l.type);return <a className="public-link" key={l.id} href={l.url} onClick={(e)=>click(e,l)}><span className="public-link-icon"><I size={18}/></span><span><b>{l.title}</b><small>{l.type}</small></span><ExternalLink size={16}/></a>})}</div>
        <div className="public-footer"><span>Powered by <b>ELVRA</b></span><span className="dot"/></div>
      </div>
    </div>
  </div>
}
