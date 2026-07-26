import React, { useState, useEffect } from 'react';
import { Modal, Select, Input, Button, notification, Table, Tag } from 'antd';

const API_URL = import.meta.env.VITE_API_URL || '';
const tok = () => localStorage.getItem('accessToken');
const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` });

export default function AwardManagementTab({ contestId, teams: propTeams }) {
  const [prizes, setPrizes] = useState([]);
  const [claims, setClaims] = useState([]);
  const [teams, setTeams] = useState(propTeams || []);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('prizes'); // 'prizes' | 'claims'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState(null); // null for create
  const [formState, setFormState] = useState({
    name: '',
    value: '',
    description: '',
    rank_required: '',
    awarded_team_id: ''
  });

  // Fetch prizes
  const fetchPrizes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/prize/${contestId}`, { headers: hdrs() });
      if (res.ok) {
        const data = await res.json();
        setPrizes(data.prizes || []);
      } else {
        notification.error({ message: 'Không thể tải danh sách giải thưởng' });
      }
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Lỗi hệ thống khi tải giải thưởng' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch claims
  const fetchClaims = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prize/${contestId}/claims`, { headers: hdrs() });
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch teams
  const fetchTeams = async () => {
    try {
      const res = await fetch(`${API_URL}/api/teams/contests/${contestId}/teams`, { headers: hdrs() });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (contestId) {
      fetchPrizes();
      fetchClaims();
      if (!propTeams || propTeams.length === 0) {
        fetchTeams();
      }
    }
  }, [contestId, propTeams]);

  // Open modal
  const openCreateModal = () => {
    setEditingPrize(null);
    setFormState({
      name: '',
      value: '',
      description: '',
      rank_required: '',
      awarded_team_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prize) => {
    setEditingPrize(prize);
    setFormState({
      name: prize.name,
      value: prize.value || '',
      description: prize.description || '',
      rank_required: prize.rank_required || '',
      awarded_team_id: prize.awarded_team?.team_id || ''
    });
    setIsModalOpen(true);
  };

  // Submit prize create/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name) {
      notification.warning({ message: 'Vui lòng điền tên giải thưởng' });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingPrize 
        ? `${API_URL}/api/prize/${editingPrize.prize_id}` 
        : `${API_URL}/api/prize`;
      
      const method = editingPrize ? 'PUT' : 'POST';
      const body = editingPrize
        ? {
            name: formState.name,
            value: formState.value,
            description: formState.description,
            rank_required: formState.rank_required ? Number(formState.rank_required) : null,
            awarded_team_id: formState.awarded_team_id || null
          }
        : {
            contest_id: contestId,
            name: formState.name,
            value: formState.value,
            description: formState.description,
            rank_required: formState.rank_required ? Number(formState.rank_required) : null,
            awarded_team_id: formState.awarded_team_id || null
          };

      const res = await fetch(url, {
        method,
        headers: hdrs(),
        body: JSON.stringify(body)
      });

      if (res.ok) {
        notification.success({ 
          message: editingPrize ? 'Cập nhật giải thưởng thành công' : 'Tạo giải thưởng thành công' 
        });
        setIsModalOpen(false);
        fetchPrizes();
        fetchClaims();
      } else {
        const errData = await res.json();
        notification.error({ message: errData.message || 'Lỗi khi lưu giải thưởng' });
      }
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Lỗi kết nối' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete prize
  const handleDelete = async (prizeId) => {
    Modal.confirm({
      title: 'Xác nhận xóa giải thưởng',
      content: 'Bạn có chắc chắn muốn xóa giải thưởng này không? Các thông tin nhận giải liên quan cũng sẽ bị xóa.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await fetch(`${API_URL}/api/prize/${prizeId}`, {
            method: 'DELETE',
            headers: hdrs()
          });
          if (res.ok) {
            notification.success({ message: 'Đã xóa giải thưởng' });
            fetchPrizes();
            fetchClaims();
          } else {
            notification.error({ message: 'Lỗi khi xóa giải thưởng' });
          }
        } catch (err) {
          console.error(err);
          notification.error({ message: 'Lỗi kết nối' });
        }
      }
    });
  };

  return (
    <div className="hd-section" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div className="hd-section-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="hd-section-title" style={{ fontSize: '1.8rem', fontWeight: 800, textShadow: '0 0 10px rgba(0, 240, 255, 0.2)', margin: 0 }}>
            Quản Lý Giải Thưởng
          </h2>
          <p className="hd-section-desc" style={{ margin: '6px 0 0' }}>
            Tạo các hạng mục giải thưởng, trao giải cho các đội thi và quản lý thông tin nhận thưởng
          </p>
        </div>

        <button className="hd-btn-add" onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>➕</span> Thêm giải thưởng
        </button>
      </div>

      {/* Sub-tabs selector */}
      <div className="pool-tabs" style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 20 }}>
        <button
          onClick={() => setActiveSubTab('prizes')}
          style={{
            background: activeSubTab === 'prizes' ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            color: activeSubTab === 'prizes' ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
            border: activeSubTab === 'prizes' ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '6px 18px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          🏆 Danh sách giải thưởng ({prizes.length})
        </button>
        <button
          onClick={() => setActiveSubTab('claims')}
          style={{
            background: activeSubTab === 'claims' ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
            color: activeSubTab === 'claims' ? '#00d4ff' : 'rgba(255, 255, 255, 0.6)',
            border: activeSubTab === 'claims' ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '6px 18px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          💳 Thông tin nhận giải ({claims.length})
        </button>
      </div>

      {activeSubTab === 'prizes' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#7f9bb3' }}>Đang tải danh sách giải thưởng...</div>
          ) : prizes.length === 0 ? (
            <div style={{
              background: 'rgba(10, 19, 34, 0.6)',
              border: '1px dashed #162036',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              color: '#7f9bb3'
            }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>🏆</span>
              Chưa có giải thưởng nào được tạo. Hãy nhấn nút "Thêm giải thưởng" để bắt đầu.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {prizes.map((p) => (
                <div key={p.prize_id} style={{
                  background: 'linear-gradient(180deg, rgba(15, 30, 48, 0.8), rgba(10, 20, 35, 0.9))',
                  border: '1px solid #162036',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'border-color 0.15s',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: '#00d4ff' }}>{p.name}</h3>
                    {p.rank_required && (
                      <span style={{
                        fontSize: '0.72rem',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#c084fc',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontWeight: 600
                      }}>
                        Rank {p.rank_required}
                      </span>
                    )}
                  </div>

                  {p.value && (
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2dd4bf' }}>
                      💰 Trị giá: {p.value}
                    </div>
                  )}

                  {p.description && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f9bb3', lineHeight: 1.4 }}>
                      {p.description}
                    </p>
                  )}

                  <div style={{
                    marginTop: 'auto',
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#3a5068', display: 'block' }}>Đội được trao</span>
                      {p.awarded_team ? (
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                          🎉 {p.awarded_team.team_name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#7f9bb3', fontStyle: 'italic' }}>
                          Chưa trao giải
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => openEditModal(p)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(p.prize_id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'rgba(10, 19, 34, 0.6)', border: '1px solid #162036', borderRadius: 12, overflow: 'hidden' }}>
          {claims.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#7f9bb3' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: 12 }}>💳</span>
              Chưa có đội nào gửi thông tin nhận giải thưởng.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#dce8f5' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 30, 48, 0.8)', borderBottom: '1px solid #162036', textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Giải Thưởng</th>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Đội Nhận Giải</th>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Đại Diện Liên Hệ</th>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Thông Tin Ngân Hàng</th>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Ghi Chú</th>
                    <th style={{ padding: '14px 16px', color: '#00d4ff' }}>Thời Gian Gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: 'rgba(10, 19, 34, 0.3)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{c.prize_id?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#2dd4bf' }}>{c.prize_id?.value}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.team_id?.team_name || 'Unknown'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div>{c.contact_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#7f9bb3' }}>{c.contact_email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', whiteSpace: 'pre-wrap', color: '#2dd4bf', fontFamily: 'monospace' }}>
                        {c.bank_info}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#7f9bb3' }}>{c.note || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#3a5068' }}>
                        {new Date(c.submitted_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Prize Modal */}
      <Modal
        title={editingPrize ? "Cập Nhật Giải Thưởng" : "Tạo Giải Thưởng Mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={500}
        styles={{ body: { padding: '12px 0 0' } }}
        className="dark-modal"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="hd-field">
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Tên giải thưởng *
            </label>
            <input
              required
              placeholder="Ví dụ: Giải Nhất, Giải Sáng Tạo,..."
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid #162036',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          <div className="hd-field">
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Trị giá giải thưởng
            </label>
            <input
              placeholder="Ví dụ: 10,000,000 VND, Cúp & Kỷ niệm chương,..."
              value={formState.value}
              onChange={(e) => setFormState({ ...formState, value: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid #162036',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          <div className="hd-field">
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Xếp hạng tối thiểu yêu cầu (Rank required)
            </label>
            <input
              type="number"
              placeholder="Để trống nếu không yêu cầu thứ hạng cụ thể"
              value={formState.rank_required}
              onChange={(e) => setFormState({ ...formState, rank_required: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid #162036',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          <div className="hd-field">
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
              Mô tả giải thưởng
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả về tiêu chí hoặc quà tặng chi tiết..."
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid #162036',
                borderRadius: 6,
                padding: '8px 12px',
                color: '#fff',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingPrize ? "Cập Nhật" : "Tạo Mới"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
