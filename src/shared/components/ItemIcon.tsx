/**
 * ItemIcon — thin wrapper around `lucide-react`.
 *
 * Defaults strokeWidth to 1.75 (Lucide ships at 2 which reads heavy at small
 * sizes) and accepts semantic size tokens (`sm | md | lg | xl`).
 *
 * Usage:
 *   <ItemIcon icon={Home} />            // md (18px), strokeWidth 1.75
 *   <ItemIcon icon={Star} size="sm" />  // 14px, inline-in-text
 *   <ItemIcon icon={Plus} size={28} />  // explicit px override
 *
 * Tree-shaking: each call site imports the specific Lucide icon directly.
 * Lucide ships individual .mjs files per icon so Vite never pre-bundles
 * the full 4MB barrel — dev + prod bundle sizes are both minimal.
 */

import type { LucideIcon, LucideProps } from 'lucide-react';
import { iconSize, iconStroke, type IconSizeToken } from '@/shared/lib/DesignTokens';

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon;
  size?: IconSizeToken | number;
}

export function ItemIcon({
  icon: IconCmp,
  size = 'md',
  strokeWidth = iconStroke,
  ...rest
}: IconProps) {
  const px = typeof size === 'number' ? size : iconSize[size];
  return <IconCmp size={px} strokeWidth={strokeWidth} {...rest} />;
}
