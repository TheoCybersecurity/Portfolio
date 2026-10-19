import { cn, getCategoryStyle } from '@/lib/utils'
import type { ProjectCategory } from '@/data/types'

interface BadgeProps {
  category: ProjectCategory
  className?: string
}

export default function Badge({ category, className }: BadgeProps) {
  const { label, className: colorClass } = getCategoryStyle(category)
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
