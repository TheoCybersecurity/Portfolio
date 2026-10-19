import { cn } from '@/lib/utils'

interface SkillTagProps {
  label: string
  className?: string
}

export default function SkillTag({ label, className }: SkillTagProps) {
  return (
    <span
      className={cn(
        'inline-block px-2.5 py-1 rounded-md text-xs font-mono',
        'bg-surface border border-border text-accent-warm',
        'transition-colors duration-150 hover:border-accent/50 hover:text-accent',
        className
      )}
    >
      {label}
    </span>
  )
}
