import { cn } from '../../lib/utils'

const variants: Record<string, string> = {
  h1b: 'bg-green/15 text-green',
  'no-h1b': 'bg-red/15 text-red',
  location: 'bg-surface3 text-text2',
  salary: 'bg-orange/10 text-orange',
  experience: 'bg-blue/10 text-blue',
  remote: 'bg-green/10 text-green',
  source: 'bg-surface3 text-text2',
  skill: 'bg-surface3 text-text2 font-normal text-[0.65rem]',
}

interface Props {
  variant: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant, children, className }: Props) {
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded text-[0.7rem] font-semibold',
      variants[variant] || variants.location,
      className,
    )}>
      {children}
    </span>
  )
}
