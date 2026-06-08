import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Tag, Button, Spin, Empty } from 'antd';
import { useAuth } from '../../../context/AuthContext';
import { useApi } from '../../../hooks/useApi';
import { ScoreDrawer } from './ScoreDrawer';

const { Title, Text } = Typography;

export const PresentationPage = () => {
  const { contestId, roundId } = useParams();
  const { user }    = useAuth();
  const { request } = useApi();

  const [pools,         setPools]         = useState([]);
  const [scoredTeamIds, setScoredTeamIds] = useState(new Set());
  const [loading,       setLoading]       = useState(true);
  const [drawerTeam,    setDrawerTeam]    = useState(null);

  const isMentor = user?.roles?.some((r) => r.role_name === 'mentor');

  useEffect(() => {
    const load = async () => {
      try {
        const res   = await request(`/api/teams/contests/${contestId}/all`);
        const teams = (Array.isArray(res) ? res : res?.data ?? [])
          .filter((t) => t.status === 'confirmed');

        const poolMap = new Map();
        teams.forEach((team) => {
          const poolId   = team.pool_id?._id ?? team.pool_id ?? 'unassigned';
          const poolName = team.pool_id?.pool_name ?? 'Chưa phân bảng';
          if (!poolMap.has(poolId)) {
            poolMap.set(poolId, { poolId, poolName, teams: [] });
          }
          poolMap.get(poolId).teams.push(team);
        });

        poolMap.forEach((pool) => {
          pool.teams.sort((a, b) => a.team_name.localeCompare(b.team_name, 'vi'));
        });

        setPools(
          [...poolMap.values()].sort((a, b) =>
            a.poolName.localeCompare(b.poolName, 'vi')
          )
        );

        if (isMentor) {
          try {
            const prog = await request(
              `/api/scores/contests/${contestId}/rounds/${roundId}/progress`
            );
            const list = Array.isArray(prog) ? prog : prog?.scores ?? prog?.data ?? [];
            setScoredTeamIds(
              new Set(
                list
                  .filter((s) => s.submitted)
                  .map((s) => s.team_id?._id ?? s.team_id)
              )
            );
          } catch (_) {}
        }
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [contestId, roundId, isMentor]);

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <Spin size="large" />
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <Title level={3} className="!mb-0">🎤 Lịch Thuyết Trình</Title>
        <Link to={`/leaderboard/${contestId}/${roundId}`}>
          <Button>📊 Xem Leaderboard</Button>
        </Link>
      </div>

      {pools.length === 0 ? (
        <Empty description="Chưa có đội nào trong lịch thuyết trình" />
      ) : (
        pools.map((pool) => (
          <div key={pool.poolId} className="mb-8">
            <div className="text-xs uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-1 mb-3">
              {pool.poolName}
            </div>

            <div className="flex flex-col gap-2">
              {pool.teams.map((team) => {
                globalIndex += 1;
                const idx      = globalIndex;
                const isScored = scoredTeamIds.has(team._id);

                return (
                  <div
                    key={team._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                        #{idx}
                      </span>
                      <Text strong>{team.team_name}</Text>
                      {isScored && <Tag color="green">✓ Đã chấm</Tag>}
                    </div>

                    {isMentor && (
                      <Button
                        type={isScored ? 'default' : 'primary'}
                        size="small"
                        onClick={() => setDrawerTeam(team)}
                      >
                        {isScored ? '✏️ Sửa' : '🏆 Chấm'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      <ScoreDrawer
        open={drawerTeam !== null}
        onClose={() => setDrawerTeam(null)}
        team={drawerTeam}
        contestId={contestId}
        roundId={roundId}
      />
    </div>
  );
};
