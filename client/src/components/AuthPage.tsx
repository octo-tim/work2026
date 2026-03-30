/**
 * AuthPage Component
 * Design: Japanese Zen Minimalism
 * - 깔끔한 로그인 페이지
 * - Manus OAuth 연동
 */

import { Button } from '@/components/ui/button';
import { getLoginUrl } from '@/const';
import { ClipboardList, LogIn } from 'lucide-react';

export function AuthPage() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-8">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
            업무관리 시스템
          </h1>
          <p className="text-muted-foreground">
            Task Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-sm p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-medium text-foreground mb-2">
              로그인이 필요합니다
            </h2>
            <p className="text-sm text-muted-foreground">
              업무를 관리하려면 먼저 로그인해 주세요.
            </p>
          </div>

          <Button 
            onClick={handleLogin}
            className="w-full h-11 gap-2"
          >
            <LogIn className="w-4 h-4" />
            로그인 / 회원가입
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Manus 계정으로 간편하게 로그인할 수 있습니다.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          © 2026 Task Manager. All rights reserved.
        </p>
      </div>
    </div>
  );
}
