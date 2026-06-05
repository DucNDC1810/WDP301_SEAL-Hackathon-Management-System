import { useState } from 'react';
import { Space, Button } from 'antd';
import { SelectTopicModal } from './SelectTopicModal';
import { ProposeTopicModal } from './ProposeTopicModal';

export function TopicActions({ teamId, contestId, onSuccess }) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  return (
    <>
      <Space style={{ marginTop: 12 }}>
        <Button onClick={() => setSelectOpen(true)}>Chọn đề tài có sẵn</Button>
        <Button type="primary" onClick={() => setProposeOpen(true)}>Đề xuất đề tài</Button>
      </Space>

      <SelectTopicModal
        open={selectOpen}
        contestId={contestId}
        teamId={teamId}
        onClose={() => setSelectOpen(false)}
        onSuccess={onSuccess}
      />
      <ProposeTopicModal
        open={proposeOpen}
        teamId={teamId}
        onClose={() => setProposeOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  );
}
