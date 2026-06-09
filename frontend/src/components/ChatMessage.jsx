import React from "react";
import { IconUser, IconSpark } from "./Icons.jsx";

export default function ChatMessage({ message }) {
  const { role, text, sources, streaming, thinking } = message;
  const isUser = role === "user";

  return (
    <div className={"gd-msg " + (isUser ? "user" : "ai")}>
      <div className={"gd-avatar " + (isUser ? "user" : "ai")}>
        {isUser ? <IconUser /> : <IconSpark />}
      </div>

      <div className="gd-msg-body">
        <div className="gd-msg-role">{isUser ? "나" : "AI 답변"}</div>

        {thinking ? (
          <div className="gd-typing" aria-label="답변 생성 중">
            <i /><i /><i />
          </div>
        ) : (
          <div className="gd-msg-text">
            {text}
            {streaming && <span className="gd-caret" />}
          </div>
        )}

        {!streaming && !thinking && sources?.length > 0 && (
          <div className="gd-msg-sources">
            <div className="gd-sources-label">출처</div>
            {sources.map((s, i) => (
              <a key={i} className="gd-source" href={`/docs/${s.document_id}`} target="_blank" rel="noreferrer">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                {s.filename} {s.page_number}p
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
