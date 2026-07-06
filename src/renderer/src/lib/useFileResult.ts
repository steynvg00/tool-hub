import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileResult } from './api'

/**
 * Holds the current downloadable result and revokes the previous object URL
 * whenever it's replaced or the component unmounts, so we don't leak blobs.
 */
export function useFileResult(): [FileResult | null, (r: FileResult | null) => void] {
  const [result, setState] = useState<FileResult | null>(null)
  const ref = useRef<FileResult | null>(null)

  const set = useCallback((r: FileResult | null) => {
    if (ref.current) URL.revokeObjectURL(ref.current.url)
    ref.current = r
    setState(r)
  }, [])

  useEffect(
    () => () => {
      if (ref.current) URL.revokeObjectURL(ref.current.url)
    },
    []
  )

  return [result, set]
}
