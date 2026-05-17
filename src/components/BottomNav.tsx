/**
 * BottomNav — primary navigation on phones (`viewport.class === 'compact'`).
 *
 * Three destinations: Home / Search / More. The search tab opens the command
 * palette (no route); the "More" tab opens the existing sidebar drawer.
 * Pure-CSS active state via NavLink's active className.
 *
 * Sits inside Mantine's AppShell.Footer so it auto-reserves bottom layout
 * space. Honors `env(safe-area-inset-bottom)` so the row clears the iPhone
 * home indicator when installed as a PWA.
 */

import { Link, useLocation } from 'react-router-dom';
import { UnstyledButton } from '@mantine/core';
import { Home, Search, Menu, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { useModePath } from '../lib/data-mode';
import { requestSpotlight } from '../lib/spotlight-bridge';

export const BOTTOM_NAV_HEIGHT = 56;

interface BottomNavProps {
  /** Callback to open the sidebar drawer (the "More" tab). */
  onOpenDrawer: () => void;
}

export function BottomNav({ onOpenDrawer }: BottomNavProps) {
  const { t } = useTranslation();
  const path = useModePath();
  const { pathname } = useLocation();
  const home = path('/');
  const isHome = pathname === home;

  return (
    <nav
      className="bottom-nav"
      aria-label={t('nav.home')}
      style={{
        height: BOTTOM_NAV_HEIGHT,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <NavItem to={home} active={isHome} icon={Home} label={t('nav.home')} />
      <NavButton onClick={() => requestSpotlight()} icon={Search} label={t('nav.search')} />
      <NavButton onClick={onOpenDrawer} icon={Menu} label={t('nav.more')} />
    </nav>
  );
}

interface NavItemProps {
  to: string;
  active: boolean;
  icon: LucideIcon;
  label: string;
}

function NavItem({ to, active, icon, label }: NavItemProps) {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      className={`bottom-nav-item${active ? ' bottom-nav-item--active' : ''}`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon icon={icon} size="lg" />
      <span className="bottom-nav-item__label">{label}</span>
    </UnstyledButton>
  );
}

interface NavButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

function NavButton({ onClick, icon, label }: NavButtonProps) {
  return (
    <UnstyledButton onClick={onClick} className="bottom-nav-item" aria-label={label}>
      <Icon icon={icon} size="lg" />
      <span className="bottom-nav-item__label">{label}</span>
    </UnstyledButton>
  );
}
