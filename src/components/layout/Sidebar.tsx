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
  CreditCard,
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
  { label: 'EMI & Loan', path: '/emi-loan', icon: CreditCard },
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
        <h4 className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8FA2BA]">
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
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-[#29496F] text-[#FFFFFF] font-semibold shadow-xs'
                    : 'text-[#D3DCE7] hover:bg-[#203B60] hover:text-[#FFFFFF]',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-[#E3C98E]' : 'text-[#C1CCDA]'
                  )}
                />
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
        'hidden lg:flex h-screen flex-col border-r border-[#1D3552] bg-[#122641] text-[#D3DCE7] shadow-xl transition-all duration-300 select-none sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b border-[#1D3552] px-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17345C] text-[#C5A565] shadow-xs ring-1 ring-[#C5A565]/40">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="flex flex-col overflow-hidden text-left">
              <span className="truncate text-sm font-bold text-white tracking-wide">
                Finora
              </span>
              <span className="text-[9px] font-semibold text-[#C5A565] uppercase tracking-wider">
                Wealth Manager
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#17345C] text-[#C5A565] shadow-xs ring-1 ring-[#C5A565]/40">
            <Wallet className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        {renderNavGroup('Workspace', mainNavItems)}
        {renderNavGroup('Manage', financeNavItems)}
        {renderNavGroup('Shortcuts', transactionShortcuts)}
      </div>

      {/* Sidebar Footer Card (#1D3552) */}
      <div className="border-t border-[#1D3552] bg-[#1D3552]/40 p-2 space-y-1">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Settings' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            location.pathname === '/settings'
              ? 'bg-[#29496F] text-[#FFFFFF] font-semibold'
              : 'text-[#D3DCE7] hover:bg-[#203B60] hover:text-[#FFFFFF]',
            collapsed && 'justify-center px-2'
          )}
        >
          <Settings
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              location.pathname === '/settings' ? 'text-[#E3C98E]' : 'text-[#C1CCDA]'
            )}
          />
          {!collapsed && <span>Settings</span>}
        </button>

        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full text-[#8FA2BA] hover:text-[#FFFFFF] hover:bg-[#203B60] justify-center h-8',
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
