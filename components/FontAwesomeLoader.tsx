'use client'

import { useEffect } from 'react'

/**
 * Loads Font Awesome CSS asynchronously to avoid blocking render.
 * Uses a dynamic link injection approach that works with React.
 */
export default function FontAwesomeLoader() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
    link.media = 'all'
    link.crossOrigin = 'anonymous'
    
    document.head.appendChild(link)
    
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return null
}
