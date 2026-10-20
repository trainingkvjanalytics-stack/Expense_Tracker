import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths } from 'date-fns';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface HeaderProps {
  selectedMonth: Date;
  onMonthChange?: (date: Date) => void;
}

export const Header: React.FC<HeaderProps> = ({ selectedMonth, onMonthChange }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handlePrevMonth = () => {
    if (onMonthChange) {
      onMonthChange(subMonths(selectedMonth, 1));
    }
  };

  const handleNextMonth = () => {
    if (onMonthChange) {
      onMonthChange(addMonths(selectedMonth, 1));
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
        navigate('/login');
      }
    } catch {
      toast.error('An unexpected error occurred during logout');
    }
  };

  const userInitials =
    user?.user_metadata?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    'U';

  const userDisplayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between bg-primary px-3 text-primary-foreground shadow-sm transition-all sm:px-5">
      {/* App branding */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground">
          <Wallet className="h-4 w-4" />
        </div>
        <span className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
          My Money Tracker
        </span>
      </div>

      {/* Center: Selected Month Navigation */}
      <div className="flex items-center gap-0.5 rounded-full bg-primary-foreground/10 px-1 py-0.5 text-white backdrop-blur-xs">
        {onMonthChange && (
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-primary-foreground/20 hover:text-white"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <span className="px-2 text-xs font-semibold whitespace-nowrap text-white sm:text-sm">
          {format(selectedMonth, 'MMM yyyy')}
        </span>
        {onMonthChange && (
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-primary-foreground/20 hover:text-white"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right: User Profile Dropdown */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-hidden rounded-full ring-2 ring-primary-foreground/20 transition-all hover:ring-primary-foreground/50">
            <Avatar className="h-8 w-8 border border-primary-foreground/20">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={userDisplayName} />
              <AvatarFallback className="bg-primary-foreground/20 text-xs font-bold text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-1">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{userDisplayName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="cursor-pointer gap-2"
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="cursor-pointer gap-2"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
