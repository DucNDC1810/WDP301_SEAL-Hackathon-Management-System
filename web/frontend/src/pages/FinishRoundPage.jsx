import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoundSetup, finishRound } from '../api/round';

export default function FinishRoundPage() {
  const { round_id } = useParams();
  const navigate = useNavigate();

  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  // 2-step confirm state
  const [step, setStep] = useState(0); // 0=idle, 1=step1, 2=step2
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await getRoundSetup(round_id);
        setRound(res.data?.round ?? null);
      } catch {
        setError('Không thể tải thông tin vòng thi.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [round_id]);

  async function handleFinish() {
    if (confirmInput !== 'CONFIRM') return;
    setSubmitting(true);
    setError(null);
    try {
      await finishRound(round_id);
      setSuccessMsg('Kết quả đã được công bố');
      setStep(0);
      setTimeout(() => navigate(`/ranking/${round_id}/teams`), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Đang tải...
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400">
        Không tìm thấy vòng thi.
      </div>
    );
  }

  if (round.status !== 'PENDING_CONFIRM') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md text-center">
          <div className="text-yellow-400 text-4xl mb-4">⚠️</div>
          <p className="text-gray-300 text-base">
            Chỉ có thể xác nhận FINISHED từ trạng thái PENDING_CONFIRM
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Trạng thái hiện tại: <span className="text-white font-semibold">{round.status}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{round.name}</h1>
        <p className="text-gray-400 text-sm mb-6">Xác nhận kết quả & Công bố chung kết</p>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          PENDING_CONFIRM — Chờ xác nhận
        </div>

        {/* Summary card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Tóm tắt vòng thi
          </h2>
          <div className="flex gap-6 text-sm text-gray-300">
            <div>
              <span className="text-gray-500">Loại vòng:</span>{' '}
              <span className="text-white font-medium">{round.type}</span>
            </div>
            {round.top_n && round.type !== 'FINAL' && (
              <div>
                <span className="text-gray-500">Top N:</span>{' '}
                <span className="text-white font-medium">{round.top_n}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Sau khi xác nhận, toàn bộ điểm NORMAL sẽ được đánh dấu{' '}
            <span className="text-white">is_final = true</span> và kết quả sẽ được công bố
            cho các thành viên.
          </p>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-4 py-3 mb-4 text-sm">
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Action button */}
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Xác nhận FINISHED & Công bố kết quả
          </button>
        )}

        {/* Step 1 — first confirm */}
        {step === 1 && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-5">
            <p className="text-white font-medium mb-4">
              Bạn chắc chắn muốn công bố kết quả?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => setStep(0)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — type CONFIRM */}
        {step === 2 && (
          <div className="bg-gray-800 border border-red-800 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-red-400 text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-red-300 font-semibold text-sm mb-1">
                  CẢNH BÁO: Terminal state — không thể hoàn tác
                </p>
                <p className="text-gray-400 text-sm">
                  Nhập <span className="text-white font-mono font-bold">CONFIRM</span> để tiếp tục.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder="Nhập CONFIRM"
              className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:border-red-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={handleFinish}
                disabled={confirmInput !== 'CONFIRM' || submitting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận FINISHED'}
              </button>
              <button
                onClick={() => { setStep(0); setConfirmInput(''); }}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
