import React, { useContext } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Globe2, LogOut, Menu, Moon, Settings as SettingsIcon, Sun, UserRound, X } from 'lucide-react'
import { AppContext } from '../main'
import { supabase } from '../lib/supabase'

export default function Layout({ children }) {
  const { t, theme, setTheme, lang, setLang } = useContext(AppContext)
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const links = [
    { to: '/', label: t.dashboard, icon: Globe2 },
    { to: '/profile', label: t.profile, icon: UserRound },
    { to: '/analytics', label: t.analytics, icon: BarChart3 },
    { to: '/settings', label: t.settings, icon: SettingsIcon },
  ]
  const logout = async () => { await supabase.auth.signOut(); navigate('/login') }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Link to="/" className="brand"><span className="brand-orb">E</span><span>ELVRA</span></Link>
          <button className="icon-btn mobile-only" onClick={() => setOpen(false)} aria-label="close"><X size={19}/></button>
        </div>
        <div className="side-copy">DIGITAL IDENTITY<br/><span>ONE LINK. YOUR WORLD.</span></div>
        <nav>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-spacer" />
        <div className="side-controls">
          <div className="segmented"><button onClick={() => setLang('en')} className={lang === 'en' ? 'sel' : ''}>EN</button><button onClick={() => setLang('fr')} className={lang === 'fr' ? 'sel' : ''}>FR</button><button onClick={() => setLang('ar')} className={lang === 'ar' ? 'sel' : ''}>AR</button></div>
          <button className="control-row" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17}/> : <Sun size={17}/>}<span>{theme === 'light' ? t.dark : t.light}</span></button>
          <button className="control-row danger" onClick={logout}><LogOut size={17}/><span>{t.signOut}</span></button>
        </div>
      </aside>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="mobile-top"><button className="icon-btn" onClick={() => setOpen(true)}><Menu size={20}/></button><Link className="mobile-brand" to="/">ELVRA</Link><button className="icon-btn" onClick={() => navigate('/profile')}><UserRound size={19}/></button></header>
        {children}
      </div>
    </div>
  )
}
