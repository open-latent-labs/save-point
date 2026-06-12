import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { loadRooms, deleteRoom } from "../data/chatRooms.js";
import { IconClose } from "../components/Icons.jsx";
import Topbar from "../components/Topbar.jsx";

export default function ChatHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { onMenu, onProfile } = useOutletContext();
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadRooms(user?.id).then(setRooms);
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.title.toLowerCase().includes(q));
  }, [rooms, query]);

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

          <div className="gd-history-search-row">
            <input
              className="gd-history-search-input"
              type="text"
              placeholder="채팅방 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
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
                  <span className="gd-history-item-date">{room.date?.slice(5)}</span>
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
