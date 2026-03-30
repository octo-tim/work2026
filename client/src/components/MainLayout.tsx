/**
 * MainLayout Component
 * 업무관리와 매출관리를 구분하는 메인 네비게이션 레이아웃
 * 모바일 반응형 지원
 */

import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  ClipboardList, 
  TrendingUp, 
  User, 
  LogOut, 
  ChevronDown,
  Loader2,
  Target,
  Settings,
  UserCircle,
  LayoutDashboard,
  FileText,
  Users,
  Menu,
  X,
  BarChart3,
  Wallet,
  Activity,
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 로그인 필요
  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const navItems = [
    { path: '/dashboard', label: '대시보드', icon: LayoutDashboard },
    { path: '/tasks', label: '업무관리', icon: ClipboardList },
    { path: '/sales', label: '매출관리', icon: TrendingUp },
    { path: '/business-plan', label: '사업계획', icon: BarChart3 },
    { path: '/vision', label: '비전목표', icon: Target },
    { path: '/meetings', label: '회의록', icon: FileText },
    { path: '/kpi', label: '실적관리', icon: Activity },
    { path: '/reports', label: '보고서', icon: FileText },
  ];

  // 소유자 전용 메뉴 (소유자만 표시)
  const ownerNavItems = user?.role === 'admin' ? [
    { path: '/financial', label: '재무현황', icon: Wallet },
  ] : [];

  // 관리자 메뉴 (관리자만 표시)
  const adminNavItems = user?.role === 'admin' ? [
    { path: '/admin', label: '조직설정', icon: Settings },
    { path: '/members', label: '멤버관리', icon: Users },
  ] : [];

  const handleLogout = async () => {
    await logout();
  };

  const handleNavClick = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴 열기</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <span>(주)옥토아이앤씨</span>
                  </SheetTitle>
                </SheetHeader>
                
                {/* Mobile Navigation */}
                <nav className="flex flex-col p-2">
                  {navItems.map((item) => {
                    const isActive = location.startsWith(item.path);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </button>
                    );
                  })}
                  
                  {/* Owner Menu in Mobile */}
                  {ownerNavItems.length > 0 && (
                    <>
                      <div className="my-2 border-t border-border" />
                      <p className="px-4 py-2 text-xs font-semibold text-indigo-600 uppercase">소유자 전용</p>
                      {ownerNavItems.map((item) => {
                        const isActive = location.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Admin Menu in Mobile */}
                  {adminNavItems.length > 0 && (
                    <>
                      <div className="my-2 border-t border-border" />
                      <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">관리자 메뉴</p>
                      {adminNavItems.map((item) => {
                        const isActive = location.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                              isActive
                                ? 'bg-amber-500 text-white'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </>
                  )}
                </nav>

                {/* Mobile User Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user?.koreanName || user?.name || '사용자'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                    {user?.role === 'admin' && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded shrink-0">
                        관리자
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleNavClick('/profile-setup')}
                    >
                      <UserCircle className="w-4 h-4 mr-1.5" />
                      프로필
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      로그아웃
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-foreground">(주)옥토아이앤씨</span>
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
              
              {/* Owner Menu */}
              {ownerNavItems.map((item) => {
                const isActive = location.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}

              {/* Admin Menu */}
              {adminNavItems.map((item) => {
                const isActive = location.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-amber-500 text-white'
                          : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logo - Mobile (Centered) */}
          <div className="flex md:hidden items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">옥토아이앤씨</span>
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {user?.koreanName || user?.name || '사용자'}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                      관리자
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.koreanName || user?.name || '사용자'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/profile-setup')} className="gap-2">
                  <UserCircle className="w-4 h-4" />
                  프로필 설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Avatar - Mobile */}
          <div className="md:hidden">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
