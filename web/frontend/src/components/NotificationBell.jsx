import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../api/notification';
import './NotificationBell.css';

const API_URL = import.meta.env.VITE_API_URL || '';

// Only maps notification types we know the destination for — unmapped types
// just mark as read, same as before, instead of risking a wrong navigation.
const NOTIFICATION_ROUTES = {
  results_published: '/dashboard/results',
  SCORE_SUBMITTED: '/dashboard',
  finalist_announcement: '/dashboard',
  deadline_reminder: '/dashboard/submit',
  missing_submission: '/dashboard/submit',
  team_mentor_assigned: '/dashboard/team',
  team_member_verified: '/dashboard/team',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      const list = res.data?.data || [];
      setNotifications(list);
      setUnreadCount(res.data?.unread_count || list.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    const token = localStorage.getItem('accessToken');
    const socket = io(API_URL, {
      withCredentials: true,
      auth: { token }
    });

    socket.on('notification', (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleItemClick = (n) => {
    if (!n.is_read) handleMarkAsRead(n._id);
    const path = NOTIFICATION_ROUTES[n.type];
    if (path) {
      setShowDropdown(false);
      navigate(path);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const isUnread = !notifications.find(n => n._id === id)?.is_read;
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (isUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="bell-wrapper" ref={dropdownRef}>
      <button
        className="bell-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Thông báo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="bell-dropdown">
          <div className="bell-dropdown__header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="bell-dropdown__read-all">
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="bell-dropdown__list">
            {notifications.length === 0 ? (
              <div className="bell-dropdown__empty">
                Không có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => {
                const formattedTime = n.created_at
                  ? new Date(n.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(n.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                  : '';
                return (
                  <div
                    key={n._id}
                    className={`bell-dropdown__item ${!n.is_read ? 'bell-dropdown__item--unread' : ''}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className="bell-dropdown__item-content">
                      <h4 className="bell-dropdown__item-title">{n.title}</h4>
                      <p className="bell-dropdown__item-message">{n.message}</p>
                      <span className="bell-dropdown__item-time">{formattedTime}</span>
                    </div>
                    <div className="bell-dropdown__item-actions">
                      {!n.is_read && <span className="bell-dropdown__item-dot" />}
                      <button
                        className="bell-dropdown__item-delete"
                        onClick={(e) => handleDeleteNotification(e, n._id)}
                        title="Xóa"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
