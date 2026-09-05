import React from 'react'
export default function StatCard({ label, value, note, icon }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><div className="stat-label">{label}</div><div className="stat-value">{value.toLocaleString()}</div><div className="stat-note">{note}</div></div></div> }
