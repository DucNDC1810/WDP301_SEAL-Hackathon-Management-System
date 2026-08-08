import { Card, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

const SEVERITY_STYLE = {
  critical: { dot: '#f87171', label: 'Gấp' },
  warning: { dot: '#f59e0b', label: 'Cần xử lý' },
  info: { dot: '#facc15', label: 'Lưu ý' },
  note: { dot: '#5a708f', label: 'Thông tin' },
};

export const TaskListCard = ({ tasks, C }) => {
  const navigate = useNavigate();
  const actionable = tasks.filter((t) => t.id !== 'all-clear').length;

  return (
    <Card
      size="small"
      styles={{ body: { padding: 0 } }}
      style={{ background: C.card, borderColor: C.line }}
      title={
        <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: C.text2 }}>
          Việc cần làm{actionable > 0 ? ` — ${actionable}` : ''}
        </span>
      }
    >
      <div className="flex flex-col">
        {tasks.map((task, i) => {
          const style = SEVERITY_STYLE[task.severity] ?? SEVERITY_STYLE.note;
          return (
            <div
              key={task.id}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.line2}` }}
            >
              <span
                className="mt-[6px] h-2 w-2 shrink-0 rounded-full"
                style={{ background: style.dot, boxShadow: `0 0 6px ${style.dot}` }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: C.text }}>
                  {task.title}
                </div>
                {task.detail && (
                  <div className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
                    {task.detail}
                  </div>
                )}
              </div>
              <Tag className="shrink-0" style={{ color: style.dot, borderColor: style.dot, background: 'transparent' }}>
                {style.label}
              </Tag>
              {task.action && (
                <button
                  type="button"
                  onClick={() => navigate(task.action.to)}
                  className="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold"
                  style={{ color: C.cyan, background: 'rgba(0,212,255,.08)', border: `1px solid ${C.cyan}44` }}
                >
                  {task.action.label} →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
