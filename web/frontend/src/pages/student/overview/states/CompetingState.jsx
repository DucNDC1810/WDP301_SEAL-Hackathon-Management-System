import { buildTasks } from '../buildTasks.js';
import { TaskListCard } from '../cards/TaskListCard.jsx';
import { CountdownCard } from '../cards/CountdownCard.jsx';
import { TeamSummaryCard } from '../cards/TeamSummaryCard.jsx';
import { RankCard } from '../cards/RankCard.jsx';
import { ProblemCard } from '../cards/ProblemCard.jsx';
import { PoolLeaderboardCard } from '../cards/PoolLeaderboardCard.jsx';
import { PresentationCard } from '../cards/PresentationCard.jsx';
import { MentorCard } from '../cards/MentorCard.jsx';
import { NewsCard } from '../cards/NewsCard.jsx';
import { ScoreTrendChart } from '../cards/ScoreTrendChart.jsx';
import { CriteriaRadarChart } from '../cards/CriteriaRadarChart.jsx';

export const CompetingState = ({ data, C }) => {
  const tasks = buildTasks(data);

  return (
    <div className="flex flex-col gap-4">
      <TaskListCard tasks={tasks} C={C} />

      <CountdownCard round={data.round} nextRound={data.next_round} submission={data.submission} C={C} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TeamSummaryCard team={data.team} contest={data.contest} git={data.git} C={C} />
        <RankCard ranking={data.ranking} round={data.round} poolName={data.team?.pool_name} C={C} warnings={data.warnings ?? []} />
        <ProblemCard round={data.round} driveLink={data.team?.pool_drive_link} poolName={data.team?.pool_name} C={C} warnings={data.warnings ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <PoolLeaderboardCard ranking={data.ranking} round={data.round} poolName={data.team?.pool_name} C={C} warnings={data.warnings ?? []} />
        <div className="flex flex-col gap-4">
          <PresentationCard presentation={data.presentation} C={C} />
          <MentorCard mentors={data.mentors} C={C} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreTrendChart scoreHistory={data.score_history} C={C} />
        <CriteriaRadarChart scoreHistory={data.score_history} C={C} />
      </div>

      <NewsCard notifications={data.notifications} C={C} />
    </div>
  );
};
