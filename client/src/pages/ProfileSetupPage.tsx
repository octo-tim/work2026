/**
 * Profile Setup Page
 * 회원가입 후 사업부, 팀, 직책, 직급 정보를 입력하는 페이지
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { Building2, Users, Briefcase, Award, Loader2, CheckCircle, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProfileSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const [koreanName, setKoreanName] = useState<string>('');
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [rankId, setRankId] = useState<number | null>(null);

  // Fetch current profile data
  const { data: profileData } = trpc.profile.get.useQuery();

  // Fetch organization data
  const { data: divisions, isLoading: divisionsLoading } = trpc.organization.division.listActive.useQuery();
  const { data: teams, isLoading: teamsLoading } = trpc.organization.team.listByDivision.useQuery(
    { divisionId: divisionId! },
    { enabled: divisionId !== null }
  );
  const { data: positions, isLoading: positionsLoading } = trpc.organization.position.listActive.useQuery();
  const { data: ranks, isLoading: ranksLoading } = trpc.organization.rank.listActive.useQuery();

  // Load existing profile data
  useEffect(() => {
    if (profileData?.user) {
      if (profileData.user.koreanName) setKoreanName(profileData.user.koreanName);
      if (profileData.user.divisionId) setDivisionId(profileData.user.divisionId);
      if (profileData.user.positionId) setPositionId(profileData.user.positionId);
      if (profileData.user.rankId) setRankId(profileData.user.rankId);
    }
  }, [profileData]);

  // Load team after division is set from profile
  useEffect(() => {
    if (profileData?.user?.teamId && divisionId === profileData.user.divisionId) {
      setTeamId(profileData.user.teamId);
    }
  }, [profileData, divisionId, teams]);

  // Profile update mutation
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success('프로필이 저장되었습니다');
      setLocation('/tasks');
    },
    onError: (error) => {
      toast.error(error.message || '프로필 저장에 실패했습니다');
    },
  });

  // Reset team when division changes
  useEffect(() => {
    setTeamId(null);
  }, [divisionId]);

  // 임원 직책 여부 확인
  const selectedPosition = positions?.find(p => p.id === positionId);
  const isExecutive = selectedPosition?.name === '임원';

  const handleSubmit = () => {
    if (!koreanName.trim()) {
      toast.error('한글 이름을 입력해주세요');
      return;
    }
    if (!positionId || !rankId) {
      toast.error('직책과 직급을 선택해주세요');
      return;
    }
    // 임원이 아닌 경우 사업부와 팀 필수
    if (!isExecutive && (!divisionId || !teamId)) {
      toast.error('사업부와 팀을 선택해주세요');
      return;
    }

    updateProfile.mutate({
      koreanName: koreanName.trim(),
      divisionId: isExecutive ? null : divisionId,
      teamId: isExecutive ? null : teamId,
      positionId,
      rankId,
    });
  };

  const handleSkip = () => {
    setLocation('/tasks');
  };

  const isComplete = koreanName.trim() && positionId && rankId && (isExecutive || (divisionId && teamId));
  const isLoading = divisionsLoading || positionsLoading || ranksLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">프로필 설정</CardTitle>
          <CardDescription className="text-base mt-2">
            {user?.koreanName || user?.name}님, 환영합니다!<br />
            조직 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">조직 정보를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* Korean Name Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  한글 이름
                </Label>
                <Input
                  type="text"
                  value={koreanName}
                  onChange={(e) => setKoreanName(e.target.value)}
                  placeholder="한글 이름을 입력하세요"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  시스템에서 표시될 이름입니다.
                </p>
              </div>

              {/* Division Select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  사업부
                  {isExecutive && <span className="text-xs text-muted-foreground">(임원은 선택 불필요)</span>}
                </Label>
                <Select
                  value={divisionId?.toString() ?? ""}
                  onValueChange={(value) => setDivisionId(parseInt(value))}
                  disabled={isExecutive}
                >
                  <SelectTrigger className={`h-11 ${isExecutive ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={isExecutive ? "임원은 사업부 선택 불필요" : "사업부를 선택하세요"} />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions?.map((division) => (
                      <SelectItem key={division.id} value={division.id.toString()}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isExecutive && (!divisions || divisions.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    등록된 사업부가 없습니다. 관리자에게 문의하세요.
                  </p>
                )}
              </div>

              {/* Team Select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  팀
                  {isExecutive && <span className="text-xs text-muted-foreground">(임원은 선택 불필요)</span>}
                </Label>
                <Select
                  value={teamId?.toString() ?? ""}
                  onValueChange={(value) => setTeamId(parseInt(value))}
                  disabled={isExecutive || !divisionId}
                >
                  <SelectTrigger className={`h-11 ${isExecutive ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={isExecutive ? "임원은 팀 선택 불필요" : (divisionId ? "팀을 선택하세요" : "먼저 사업부를 선택하세요")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsLoading ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      teams?.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!isExecutive && divisionId && (!teams || teams.length === 0) && !teamsLoading && (
                  <p className="text-xs text-muted-foreground">
                    해당 사업부에 등록된 팀이 없습니다.
                  </p>
                )}
              </div>

              {/* Position Select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  직책
                </Label>
                <Select
                  value={positionId?.toString() ?? ""}
                  onValueChange={(value) => setPositionId(parseInt(value))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="직책을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions?.map((position) => (
                      <SelectItem key={position.id} value={position.id.toString()}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!positions || positions.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    등록된 직책이 없습니다. 관리자에게 문의하세요.
                  </p>
                )}
              </div>

              {/* Rank Select */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  직급
                </Label>
                <Select
                  value={rankId?.toString() ?? ""}
                  onValueChange={(value) => setRankId(parseInt(value))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="직급을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {ranks?.map((rank) => (
                      <SelectItem key={rank.id} value={rank.id.toString()}>
                        {rank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!ranks || ranks.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    등록된 직급이 없습니다. 관리자에게 문의하세요.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkip}
                >
                  나중에 설정
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!isComplete || updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      저장하기
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
