import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, Download, ExternalLink, Globe, ImagePlus, Instagram, Link2, Mail, MapPin, Phone, Plus, QrCode, Sparkles, Trash2, X, Youtube } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import Layout from '../components/Layout'
import Toast from '../components/Toast'
import { AppContext } from '../main'
import { APP_URL, supabase } from '../lib/supabase'
import { compressImage, extractAccent } from '../lib/image'

const TYPES=['instagram','tiktok','facebook','linkedin','x','whatsapp','telegram','phone','email','website','map']
const ICONS={instagram:Instagram,tiktok:Link2,facebook:Link2,linkedin:Link2,x:Link2,whatsapp:Phone,telegram:Link2,phone:Phone,email:Mail,website:Globe,map:MapPin}
const defaults={instagram:'Instagram',tiktok:'TikTok',facebook:'Facebook',linkedin:'LinkedIn',x:'X',whatsapp:'WhatsApp',telegram:'Telegram',phone:'Phone',email:'Email',website:'Website',map:'Google Maps'}
function normalValue(type,value){
 const v=value.trim();
 if(type==='instagram' || type==='tiktok' || type==='facebook' || type==='linkedin' || type==='x'){
  if(/^https?:\/\//i.test(v))return v; return `https://${type==='x'?'x.com':type+'.com'}/${v.replace(/^@/,'')}`
 }
 if(type==='email' && !v.startsWith('mailto:'))return `mailto:${v}`
 if(type==='phone' && !v.startsWith('tel:'))return `tel:${v.replace(/\s+/g,'')}`
 if(type==='whatsapp'){const n=v.replace(/\D/g,'');return `https://wa.me/${n}`}
 if(type==='telegram' && !/^https?:/.test(v))return `https://t.me/${v.replace(/^@/,'')}`
 if(type==='map' && !/^https?:/.test(v))return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`
 if((type==='website'||type==='map') && !/^https?:/.test(v))return `https://${v}`
 return v
}
async function readFileAsImage(file, max=1400){return compressImage(file,max,0.8)}
export default function ProfileEditor(){
 const {session,t}=useContext(AppContext); const [profile,setProfile]=useState(null); const [links,setLinks]=useState([]); const [newLink,setNewLink]=useState({type:'instagram',title:'Instagram',value:''}); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState(''); const [qrOpen,setQrOpen]=useState(false)
 useEffect(()=>{(async()=>{const [{data:p},{data:l}]=await Promise.all([supabase.from('profiles').select('*').eq('id',session.user.id).single(),supabase.from('profile_links').select('*').eq('profile_id',session.user.id).order('sort_order')]);setProfile(p);setLinks(l||[])})()},[session.user.id])
 const publicUrl=profile?`${APP_URL}/p/${profile.slug}`:''
 const update=(k,v)=>setProfile(x=>({...x,[k]:v}))
 const upload=async(e,key)=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);setError('');try{const img=await readFileAsImage(f,key==='cover_url'?1600:900);update(key,img);if(key==='avatar_url' && profile?.auto_color){update('accent',await extractAccent(img))}}catch(err){setError(err.message)}finally{setBusy(false)}}
 const saveProfile=async()=>{setBusy(true);setError('');const {error:err}=await supabase.from('profiles').update({display_name:profile.display_name,bio:profile.bio,slug:profile.slug,location:profile.location,website:profile.website,avatar_url:profile.avatar_url,cover_url:profile.cover_url,accent:profile.accent,auto_color:profile.auto_color}).eq('id',session.user.id);setBusy(false);if(err)setError(err.message);else{setMessage(t.save);setTimeout(()=>setMessage(''),1400)}}
 const add=async()=>{if(!newLink.value.trim())return;setBusy(true);const {data, error:err}=await supabase.from('profile_links').insert({profile_id:session.user.id,type:newLink.type,title:newLink.title||defaults[newLink.type],value:newLink.value.trim(),url:normalValue(newLink.type,newLink.value),sort_order:links.length,active:true}).select().single();setBusy(false);if(err)return setError(err.message);setLinks([...links,data]);setNewLink({type:'instagram',title:'Instagram',value:''})}
 const remove=async(id)=>{await supabase.from('profile_links').delete().eq('id',id);setLinks(ls=>ls.filter(x=>x.id!==id))}
 const move=async(i,delta)=>{const j=i+delta;if(j<0||j>=links.length)return;const next=[...links];[next[i],next[j]]=[next[j],next[i]];setLinks(next);await Promise.all(next.map((x,idx)=>supabase.from('profile_links').update({sort_order:idx}).eq('id',x.id)))}
 const qrDownload=()=>{const canvas=document.querySelector('#elvra-qr canvas');if(!canvas)return;const link=document.createElement('a');link.download=`ELVRA-${profile.slug}.png`;link.href=canvas.toDataURL('image/png');link.click()}
 if(!profile)return <Layout><main className="page"><div className="loading-card shimmer"/></main></Layout>
 return <Layout><main className="page"><div className="page-header"><div><div className="eyebrow">ELVRA / {t.profile.toUpperCase()}</div><h1>{t.profileInfo}</h1><p>Craft a polished public card. Every click and visit is tracked through Supabase.</p></div><div className="header-actions"><button className="ghost-btn" onClick={()=>setQrOpen(true)}><QrCode size={17}/>{t.qr}</button><a className="primary-btn compact" href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/>{t.viewCard}</a></div></div>
 <div className="editor-grid">
  <section className="panel profile-panel"><div className="section-title"><span>01 / Identity</span><Sparkles size={16}/></div><div className="cover-edit" style={{backgroundImage:profile.cover_url?`url(${profile.cover_url})`:'linear-gradient(120deg,#0f1a17,#183b2c)'}}><label className="cover-button"><ImagePlus size={17}/>{t.cover}<input type="file" accept="image/*" onChange={e=>upload(e,'cover_url')} hidden/></label></div><div className="avatar-row"><div className="avatar-wrap">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{profile.display_name?.slice(0,1)||'E'}</span>}<label className="avatar-edit"><ImagePlus size={14}/><input type="file" accept="image/*" onChange={e=>upload(e,'avatar_url')} hidden/></label></div><div><b>{profile.display_name||'Your name'}</b><span>@{profile.slug}</span></div></div>
   <div className="form-grid"><label>{t.displayName}<input value={profile.display_name||''} onChange={e=>update('display_name',e.target.value)} /></label><label>{t.slug}<input value={profile.slug||''} onChange={e=>update('slug',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} /></label><label className="full">{t.bio}<textarea rows="3" value={profile.bio||''} onChange={e=>update('bio',e.target.value)} placeholder="Designer • Creator • Business owner" /></label><label>{t.location}<input value={profile.location||''} onChange={e=>update('location',e.target.value)} placeholder="Constantine, Algeria"/></label><label>{t.website}<input value={profile.website||''} onChange={e=>update('website',e.target.value)} placeholder="https://yourwebsite.com"/></label></div>
   <div className="auto-color"><label className="switch"><input type="checkbox" checked={!!profile.auto_color} onChange={async e=>{update('auto_color',e.target.checked);if(e.target.checked&&profile.avatar_url)update('accent',await extractAccent(profile.avatar_url))}}/><span/></label><div><b>{t.autoColor}</b><p>ELVRA uses the profile image to derive a complementary accent.</p></div><input type="color" value={profile.accent||'#00D084'} onChange={e=>update('accent',e.target.value)} /></div>
   <div className="panel-foot"><button className="primary-btn" onClick={saveProfile} disabled={busy}><Check size={17}/>{t.save}</button></div>
  </section>
  <section className="panel links-panel"><div className="section-title"><span>02 / Links & contacts</span><span className="muted">{links.length} active</span></div><div className="add-link-box"><div className="inline-form"><select value={newLink.type} onChange={e=>setNewLink(x=>({...x,type:e.target.value,title:defaults[e.target.value]}))}>{TYPES.map(x=><option key={x}>{x}</option>)}</select><input value={newLink.value} onChange={e=>setNewLink(x=>({...x,value:e.target.value}))} placeholder={newLink.type==='phone'?'+213 555...':'username or URL'}/><button className="icon-primary" onClick={add} disabled={busy}><Plus size={18}/></button></div><input className="mt8" value={newLink.title} onChange={e=>setNewLink(x=>({...x,title:e.target.value}))} placeholder={t.title}/></div>
   <div className="links-list">{links.length===0?<div className="empty-state"><Link2 size={25}/><b>{t.noData}</b><span>Add Instagram, WhatsApp, phone numbers, e-mails, websites or Google Maps.</span></div>:links.map((l,i)=>{const I=ICONS[l.type]||Link2;return <div className="link-row" key={l.id}><div className="drag-actions"><button onClick={()=>move(i,-1)}><ArrowUp size={15}/></button><button onClick={()=>move(i,1)}><ArrowDown size={15}/></button></div><div className="link-icon"><I size={17}/></div><div className="link-main"><b>{l.title}</b><span>{l.value}</span></div><span className="link-status"><Check size={14}/>{t.active}</span><button className="trash" onClick={()=>remove(l.id)}><Trash2 size={16}/></button></div>})}</div>
  </section>
  <section className="panel preview-panel" style={{'--preview-accent':profile.accent||'#00D084'}}><div className="section-title"><span>03 / Live preview</span><a href={publicUrl} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a></div><div className="card-preview"><div className="preview-cover" style={{backgroundImage:profile.cover_url?`url(${profile.cover_url})`:undefined}}/><div className="preview-body"><div className="preview-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{profile.display_name?.slice(0,1)||'E'}</span>}</div><h3>{profile.display_name}</h3><p>{profile.bio||'Your story starts here.'}</p><div className="preview-links">{links.slice(0,5).map(l=><div key={l.id} className="preview-link"><span>{l.title}</span><ExternalLink size={13}/></div>)}</div></div></div></section>
 </div>
 {qrOpen&&<div className="modal-backdrop" onClick={()=>setQrOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setQrOpen(false)}><X size={18}/></button><div className="eyebrow">ELVRA / QR</div><h2>{t.qr}</h2><p>Your code opens <b>{publicUrl}</b>. The QR itself has no logo in the center.</p><div id="elvra-qr" className="qr-large"><QRCodeCanvas value={publicUrl} size={260} bgColor="#ffffff" fgColor="#111111" includeMargin level="H" /></div><div className="modal-actions"><button className="primary-btn" onClick={qrDownload}><Download size={17}/>{t.download}</button><button className="ghost-btn" onClick={async()=>{await navigator.clipboard.writeText(publicUrl)}}><Copy size={17}/>{t.copyLink}</button></div></div></div>}
 <Toast message={error||message} type={error?'error':'success'} />
 </main></Layout>
}
