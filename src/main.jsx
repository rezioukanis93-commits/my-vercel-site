import React, { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { getInitialLang, translations } from './lib/i18n'
import './styles.css'
import AuthPage from './pages/AuthPage'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import Dashboard from './pages/Dashboard'
import ProfileEditor from './pages/ProfileEditor'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import PublicCard from './pages/PublicCard'

export const AppContext = React.createContext(null)

function Protected({ session, children }) {
  return session ? children : <Navigate to="/login" replace />
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState(getInitialLang())
  const [theme, setTheme] = useState(localStorage.getItem('elvra_theme') || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('elvra_theme', theme)
    localStorage.setItem('elvra_lang', lang)
  }, [lang, theme])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setLoading(false) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const t = useMemo(() => translations[lang], [lang])
  const value = useMemo(() => ({ session, lang, setLang, theme, setTheme, t }), [session, lang, theme, t])
  if (loading) return <div className="boot"><div className="boot-mark"><img src="/elvra-logo.png" alt="ELVRA" /></div><div className="spinner" /></div>

  return (
    <AppContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
        <Route path="/signup" element={session ? <Navigate to="/" replace /> : <AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/p/:slug" element={<PublicCard />} />
        <Route path="/" element={<Protected session={session}><Dashboard /></Protected>} />
        <Route path="/profile" element={<Protected session={session}><ProfileEditor /></Protected>} />
        <Route path="/analytics" element={<Protected session={session}><Analytics /></Protected>} />
        <Route path="/settings" element={<Protected session={session}><Settings /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContext.Provider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>)
