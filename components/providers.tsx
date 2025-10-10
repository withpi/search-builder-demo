"use client"

import type { ReactNode } from "react"
import { SearchProvider, useSearch } from "@/lib/search-context"
import { RubricProvider } from "@/lib/rubric-context"

function RubricProviderWrapper({ children }: { children: ReactNode }) {
  const { corpora } = useSearch()
  return <RubricProvider corpora={corpora}>{children}</RubricProvider>
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      <RubricProviderWrapper>{children}</RubricProviderWrapper>
    </SearchProvider>
  )
}
