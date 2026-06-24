import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { loadRooms, deleteRoom } from "../data/chatRooms.js";
import { formatRelativeDate } from "../utils/formatDate.js";
import { IconClose } from "../components/Icons.jsx";
import Topbar from "../components/Topbar.jsx";

const SORT_OPTIONS = [
  { key: "active", label: "활동순" },
  { key: "newest", label: "최신순" },
  { key: "name", label: "이름순" },
];

export default function ChatHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { onMenu, onProfile } = useOutletContext();
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("active");

  useEffect(() => {
    loadRooms(user?.id).then(setRooms);
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? rooms.filter((r) => r.title.toLowerCase().includes(q)) : [...rooms];

    if (sort === "name") {
      list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    } else if (sort === "newest") {
      list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    } else {
      // active: last_active_at desc
      list.sort((a, b) => (b.lastActiveAt ?? b.date ?? "").localeCompare(a.lastActiveAt ?? a.date ?? ""));
    }

    return list;
  }, [rooms, query, sort]);

  const handleDelete = async (e, roomId) => {
    e.stopPropagation();
    await deleteRoom(roomId);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    window.dispatchEvent(new Event("gamedocs:rooms"));
  };

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-history-wrap">
          <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 600 }}>채팅 기록</h2>

          <div className="gd-history-toolbar">
            <input
              className="gd-history-search-input"
              type="text"
              placeholder="채팅방 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="gd-history-sort">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`gd-history-sort-btn${sort === key ? " active" : ""}`}
                  onClick={() => setSort(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="gd-history-empty">
              {query ? "검색 결과가 없습니다" : "채팅 기록이 없습니다"}
            </div>
          ) : (
            <div className="gd-history-list">
              {filtered.map((room) => (
                <div
                  key={room.id}
                  className="gd-history-item"
                  onClick={() => navigate(`/chat?room=${room.id}`)}
                >
                  <span className="gd-history-item-title">{room.title}</span>
                  <span className="gd-history-item-date">{formatRelativeDate(room.lastActiveAt || room.date)}</span>
                  <button
                    className="gd-history-item-del"
                    onClick={(e) => handleDelete(e, room.id)}
                    aria-label="삭제"
                  >
                    <IconClose width="13" height="13" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
