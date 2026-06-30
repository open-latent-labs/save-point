import React, { useState } from "react";
import { IconUser, IconSpark } from "./Icons.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function ChatMessage({ message, userName }) {
  const { role, text, sources, streaming, thinking, isLoading } = message;
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={"gd-msg " + (isUser ? "user" : "ai")}>
      <div className={"gd-avatar " + (isUser ? "user" : "ai")}>
        {isUser ? <IconUser /> : <IconSpark />}
      </div>

      <div className="gd-msg-body">
        <div className="gd-msg-role">{isUser ? (userName || "나") : "AI 답변"}</div>

        {(thinking || isLoading) ? (
          <div className="gd-typing" aria-label="답변 생성 중">
            <i /><i /><i />
          </div>
        ) : (
          <div className={`gd-msg-text${streaming ? " streaming" : ""}`}>
            {streaming
              ? <>{text}<span className="gd-caret" /></>
              : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table({ node, children, ...props }) {
                      return (
                        <div className="gd-msg-table-wrap">
                          <table {...props}>{children}</table>
                        </div>
                      );
                    },
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

        {!isUser && !streaming && !thinking && !isLoading && text && (
          <button className="gd-copy-btn" onClick={copyText} title="답변 복사">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4.5" y="1" width="8" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1 4.5h2M1 4.5V13h7.5v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
            <span>{copied ? "복사됨" : "복사"}</span>
          </button>
        )}

        {!streaming && !thinking && !isLoading && sources?.length > 0 && (
          <div className="gd-msg-sources">
            <div className="gd-sources-label">출처</div>
            {[...new Map(sources.map((s) => [s.document_id, s])).values()].map((s, i) => (
              <a key={s.document_id} className="gd-source" href={`/docs/${s.document_id}`} target="_blank" rel="noreferrer">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                {s.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}