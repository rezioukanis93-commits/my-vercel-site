import React from 'react'
export default function Toast({ message, type='success' }) { return message ? <div className={`toast ${type}`}>{message}</div> : null }
