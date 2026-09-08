import { supabase } from './supabase'

export async function loadAnalyticsStats(profileId) {
  const [{ count: visits, error: visitsError }, { count: clicks, error: clicksError }] = await Promise.all([
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).eq('event_type', 'visit'),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('profile_id', profileId).eq('event_type', 'click')
  ])
  if (visitsError) throw visitsError
  if (clicksError) throw clicksError

  const { data: links, error: linksError } = await supabase
    .from('profile_links')
    .select('id,title,type,sort_order')
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })
  if (linksError) throw linksError

  const topLinks = await Promise.all((links || []).map(async (link) => {
    const { count, error } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('event_type', 'click')
      .eq('link_id', link.id)
    if (error) throw error
    return { ...link, clicks: Number(count || 0) }
  }))

  topLinks.sort((a, b) => b.clicks - a.clicks || a.sort_order - b.sort_order)
  return {
    visits: Number(visits || 0),
    clicks: Number(clicks || 0),
    top_links: topLinks.slice(0, 10)
  }
}
