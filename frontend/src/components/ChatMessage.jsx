import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IconUser, IconSpark } from "./Icons.jsx";

export default function ChatMessage({ message }) {
  // 메세지에서 각 내용 꺼내기
  const { role, text, sources, streaming, isLoading } = message;
  const isUser = role === "user";

  return (
    // 유저냐 ai냐에 따라 다른 ui 제공
    <div className={"gd-msg " + (isUser ? "user" : "ai")}>
      <div className={"gd-avatar " + (isUser ? "user" : "ai")}>
        {isUser ? <IconUser /> : <IconSpark />}
      </div>

      <div className="gd-msg-body">
        <div className="gd-msg-role">{isUser ? "나" : "AI 답변"}</div>

        {/* LLM의 첫 토큰을 받을 때까지 */}
        {isLoading ? (
          <div className="gd-typing" aria-label="답변 생성 중">
            <i /><i /><i />
          </div>
        ) : (
          <div className="gd-msg-text">
            {/* 토큰 받는 중이면 -> 그냥 텍스트 + 커서 애니메이션
            토큰 다 오면 마크다운 적용해서 렌더링 */}
            {streaming
              ? <>{text}<span className="gd-caret" /></>
              : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {text}
                </ReactMarkdown>
              )
            }
          </div>
        )}

        {/* 출처 목록 렌더링 @@@@@@@@22출처에 페이지 넘버 부분 수정해야함!!@@@@@@@@@@@@@@@@ */}
        {!streaming && !isLoading && sources?.length > 0 && (
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