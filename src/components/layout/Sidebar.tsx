import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  HandCoins,
  Landmark,
  Tags,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const mainNavItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Activities', path: '/activities', icon: Activity },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Investments', path: '/investments', icon: TrendingUp },
];

const financeNavItems: SidebarItem[] = [
  { label: 'Lent Money', path: '/lent-money', icon: HandCoins },
  { label: 'Bank Accounts', path: '/accounts', icon: Landmark },
  { label: 'Categories', path: '/categories', icon: Tags },
];

const transactionShortcuts: SidebarItem[] = [
  { label: 'Add Income', path: '/transaction/new/income', icon: PlusCircle },
  { label: 'Add Expense', path: '/transaction/new/expense', icon: TrendingDown },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const renderNavGroup = (title: string, items: SidebarItem[]) => (
    <div className="py-2">
      {!collapsed && (
        <h4 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {title}
        </h4>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <li key={item.path}>
              <button
                type="button"
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <aside
      className={cn(
        'hidden lg:flex h-screen flex-col border-r border-border bg-card transition-all duration-300 select-none sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="truncate text-base font-bold text-foreground">
              Money Tracker
            </span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Wallet className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {renderNavGroup('Overview', mainNavItems)}
        {renderNavGroup('Manage', financeNavItems)}
        {renderNavGroup('Shortcuts', transactionShortcuts)}
      </div>

      {/* Settings & Collapse Toggle Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-muted-foreground hover:text-foreground justify-center h-8',
            !collapsed && 'justify-between'
          )}
        >
          {!collapsed && <span className="text-xs">Collapse</span>}
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
