import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export default function FramedCard({ children, className = '' }: Props) {
  return (
    <div className={`framed ${className}`}>
      <span className="corner-tl" aria-hidden>+</span>
      <span className="corner-tr" aria-hidden>+</span>
      {children}
      <span className="corner-bl" aria-hidden>+</span>
      <span className="corner-br" aria-hidden>+</span>
    </div>
  )
}
