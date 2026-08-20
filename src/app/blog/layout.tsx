import { ReaderBootVeil } from '@/features/reader-layout'

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ReaderBootVeil />
      {children}
    </>
  )
}
