import { cn } from '../../lib/utils'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

const base = 'cursor-pointer border-none rounded-md font-medium transition-all duration-150 active:scale-[0.97]'

const variants = {
  primary: 'bg-accent text-white hover:bg-accent2',
  outline: 'bg-transparent border border-border text-text2 hover:border-text2 hover:text-text',
  danger: 'bg-transparent border border-red text-red hover:bg-red hover:text-white',
  ghost: 'bg-transparent text-text2 hover:text-text hover:bg-surface2',
}

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({ variant = 'primary', size = 'md', className, ...props }: Props) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
