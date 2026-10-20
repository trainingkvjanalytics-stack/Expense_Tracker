import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  CalendarDays,
  TrendingUp,
  MoreHorizontal,
  HandCoins,
  Landmark,
  Tags,
  Settings,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Activities', path: '/activities', icon: Activity },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Invest', path: '/investments', icon: TrendingUp },
];

const moreNavItems: NavItem[] = [
  { label: 'Lent Money', path: '/lent-money', icon: HandCoins },
  { label: 'Bank Accounts', path: '/accounts', icon: Landmark },
  { label: 'Categories', path: '/categories', icon: Tags },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreNavItems.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );

  const handleNavigate = (path: string) => {
    navigate(path);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md transition-all lg:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'flex min-h-[44px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground active:scale-95'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full transition-all',
                    isActive ? 'scale-110' : ''
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.25]')} />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-[44px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors',
              isMoreActive || moreOpen
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground active:scale-95'
            )}
          >
            <div className="flex h-6 w-6 items-center justify-center">
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="truncate">More</span>
          </button>
        </div>
      </nav>

      {/* More Navigation Bottom Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="px-4 pb-8 pt-2">
          <SheetHeader className="mb-4 flex flex-row items-center justify-between text-left">
            <SheetTitle className="text-base font-semibold">More Features</SheetTitle>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3">
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all active:scale-98',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
