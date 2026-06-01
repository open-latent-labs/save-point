import React, { useRef } from "react";
import { IconSearch, IconSpark, IconArrowUp } from "./Icons.jsx";

// 랜딩(검색)과 채팅(전송) 양쪽에서 쓰는 입력 바.
// variant: "search" → AI 검색 버튼 / "send" → 전송 화살표 버튼
export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  buttonLabel = "AI 검색",
  variant = "search",
  disabled = false,
  autoFocus = false,
}) {
  const ref = useRef(null);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="gd-searchbar">
      {variant === "search" && <IconSearch className="gd-mag" />}
      <input
        ref={ref}
        className="gd-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        autoFocus={autoFocus}
        aria-label="검색 및 질문 입력"
      />
      <button
        className="gd-btn"
        onClick={() => onSubmit?.()}
        disabled={disabled || !value.trim()}
        aria-label={buttonLabel}
      >
        {variant === "search" ? (
          <>
            <IconSpark className="gd-spark" />
            <span className="btn-label">{buttonLabel}</span>
          </>
        ) : (
          <IconArrowUp className="gd-spark" />
        )}
      </button>
    </div>
  );
}
