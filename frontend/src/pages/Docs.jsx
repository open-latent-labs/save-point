import React, { useState, useEffect } from "react";
import { useParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { getDocContent } from "../data/docsData.js";

// 문서 설명(Description) 편집을 담당하는 컴포넌트
function EditableDesc({ value, onSave, onDelete }) {
  const [editMode, setEditMode] = useState(null); // null | "edit" | "add"
  const [text, setText] = useState("");

  const normalizedValue = value === "요약 내용이 비어 있습니다." ? "" : (value || "");

  useEffect(() => {
    if (editMode === "edit") setText(normalizedValue);
    else if (editMode === "add") setText("");
  }, [editMode]);

  useEffect(() => {
    if (editMode === null) setText(normalizedValue);
  }, [value]);

  const handleSave = () => {
    if (editMode === "add") {
      onSave(normalizedValue ? normalizedValue + "\n" + text : text);
    } else {
      onSave(text);
    }
    setEditMode(null);
  };

  const handleCancel = () => setEditMode(null);

  const isEmpty = !value || value === "요약 내용이 비어 있습니다.";

  const textareaStyle = {
    width: "100%",
    minHeight: "100px",
    background: "rgba(7, 9, 10, .6)",
    border: "1px solid var(--border-strong)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "var(--text)",
    fontFamily: "var(--font-sans)",
    fontSize: "13.5px",
    lineHeight: "1.75",
    outline: "0",
    resize: "vertical",
    marginBottom: 8,
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = "var(--mint)";
    e.target.style.boxShadow = "0 0 0 3px rgba(54, 224, 161, .12)";
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = "var(--border-strong)";
    e.target.style.boxShadow = "none";
  };

  const SaveCancelButtons = () => (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={handleSave}
        style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--mint-strong)", color: "var(--mint-deep)", border: "none", cursor: "pointer" }}
      >
        저장
      </button>
      <button
        onClick={handleCancel}
        style={{ padding: "6px 16px", borderRadius: 6, fontSize: 12, border: "1px solid var(--border)", color: "var(--dim)", background: "transparent", cursor: "pointer" }}
      >
        취소
      </button>
    </div>
  );

  if (editMode === "edit") {
    return (
      <div style={{ marginBottom: 24 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="요약 내용을 입력해주세요."
          style={textareaStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <SaveCancelButtons />
      </div>
    );
  }

  if (editMode === "add") {
    return (
      <div style={{ marginBottom: 24 }}>
        {!isEmpty && (
          <p className="gd-doc-desc" style={{ margin: "0 0 12px" }}>{value}</p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="추가할 내용을 입력해주세요."
          style={textareaStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <SaveCancelButtons />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
      <p className="gd-doc-desc" style={{ margin: 0, flex: 1 }}>
        {value}
      </p>
      <div className="flex gap-2 flex-shrink-0">
        {!isEmpty && (
          <button
            onClick={() => setEditMode("edit")}
            className="px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
          >
            수정
          </button>
        )}
        {isEmpty && (
          <button
            onClick={() => setEditMode("add")}
            className="px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
          >
            내용 추가
          </button>
        )}
        {!isEmpty && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-red-500 hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

// 테이블 내부의 각각의 요약(row.desc) 셀 수정을 담당하는 컴포넌트
function EditableCell({ value, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value || "");

  useEffect(() => {
    setText(value || "");
  }, [value]);

  const handleSave = () => {
    onSave(text);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(value || "");
    setIsEditing(false);
  };

  const isEmpty = !value || value.trim() === "";

  if (isEditing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="요약 내용을 입력해주세요."
          style={{
            width: "100%",
            minHeight: "60px",
            background: "rgba(7, 9, 10, .6)",
            border: "1px solid var(--border-strong)",
            borderRadius: "6px",
            padding: "8px 10px",
            color: "var(--text)",
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            lineHeight: "1.6",
            outline: "0",
            resize: "vertical",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--mint)";
            e.target.style.boxShadow = "0 0 0 3px rgba(54, 224, 161, .12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-strong)";
            e.target.style.boxShadow = "none";
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleSave}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              background: "var(--mint-strong)",
              color: "var(--mint-deep)",
              border: "none",
              cursor: "pointer",
            }}
          >
            저장
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              border: "1px solid var(--border)",
              color: "var(--dim)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: isEmpty ? "var(--faint)" : "var(--dim)", whiteSpace: "pre-wrap" }}>
        {isEmpty ? "요약 내용이 비어 있습니다." : value}
      </span>
      <div className="flex gap-1.5 flex-shrink-0">
        {isEmpty ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-0.5 rounded text-[11px] border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
          >
            내용 추가
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-0.5 rounded text-[11px] border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
          >
            수정
          </button>
        )}
        {!isEmpty && onDelete && (
          <button
            onClick={onDelete}
            className="px-2 py-0.5 rounded text-[11px] border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-red-500 hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>
    </div>
  );
}

export default function Docs() {
  const { docId = "atlassian-intro" } = useParams();
  const { onMenu } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();

  // localStorage에 저장된 편집본이 있으면 불러오고, 없으면 기본 docsData 로드
  const [docData, setDocData] = useState(() => {
    const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return getDocContent(docId);
  });

  // docId가 변경될 때 새로운 문서를 동기화
  useEffect(() => {
    const saved = localStorage.getItem(`gamedocs_edited_${docId}`);
    if (saved) {
      try {
        setDocData(JSON.parse(saved));
        return;
      } catch (e) {
        console.error(e);
      }
    }
    setDocData(getDocContent(docId));
  }, [docId]);

  // 문서 전체 설명 요약 저장
  const handleSaveDesc = (newDesc) => {
    const updated = {
      ...docData,
      desc: newDesc,
    };
    setDocData(updated);
    localStorage.setItem(`gamedocs_edited_${docId}`, JSON.stringify(updated));
  };

  // 문서 설명 삭제
  const handleDeleteDesc = () => {
    const updated = { ...docData, desc: "" };
    setDocData(updated);
    localStorage.setItem(`gamedocs_edited_${docId}`, JSON.stringify(updated));
  };

  // 테이블 행 삭제
  const handleDeleteRow = (sectionIndex, rowIndex) => {
    const updatedSections = docData.sections.map((section, si) => {
      if (si !== sectionIndex) return section;
      return { ...section, rows: section.rows.filter((_, ri) => ri !== rowIndex) };
    });
    const updated = { ...docData, sections: updatedSections };
    setDocData(updated);
    localStorage.setItem(`gamedocs_edited_${docId}`, JSON.stringify(updated));
  };

  // 테이블 내의 행 요약 저장
  const handleSaveRowDesc = (sectionIndex, rowIndex, newDesc) => {
    const updatedSections = docData.sections.map((section, si) => {
      if (si !== sectionIndex) return section;
      const updatedRows = section.rows.map((row, ri) => {
        if (ri !== rowIndex) return row;
        return {
          ...row,
          desc: newDesc,
        };
      });
      return {
        ...section,
        rows: updatedRows,
      };
    });

    const updated = {
      ...docData,
      sections: updatedSections,
    };
    setDocData(updated);
    localStorage.setItem(`gamedocs_edited_${docId}`, JSON.stringify(updated));
  };

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} />
      <div className="gd-page-scroll">
        <div className="gd-doc-wrap">
          <div className="gd-doc-card">
            {/* 브레드크럼 */}
            <nav className="gd-breadcrumb">
              {docData.breadcrumb.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span className="gd-breadcrumb-sep">/</span>}
                  <span className={i === docData.breadcrumb.length - 1 ? "gd-breadcrumb-item last" : "gd-breadcrumb-item"}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>

            {/* 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 className="gd-doc-title" style={{ margin: 0 }}>{docData.title}</h1>
              {!location.pathname.includes("original") && (
                <button
                  onClick={() => navigate(location.pathname.replace(/\/$/, "") + "/original")}
                  className="flex-shrink-0 px-3 py-1 rounded-md text-xs border border-[var(--border)] text-[var(--dim)] bg-transparent cursor-pointer whitespace-nowrap transition-[border-color,color] duration-150 hover:border-[var(--text)] hover:text-[var(--text)]"
                >
                  원문내용 보기
                </button>
              )}
            </div>

            {/* 메타 */}
            {docData.meta && <p className="gd-doc-meta">{docData.meta}</p>}

            {/* 설명 (수정 가능한 전체 요약 설명 영역) */}
            <div style={{ marginTop: 16 }}>
              <EditableDesc value={docData.desc} onSave={handleSaveDesc} onDelete={handleDeleteDesc} />
            </div>

            {/* 섹션 테이블 */}
            {docData.sections.length > 0 ? (
              docData.sections.map((section, si) => (
                <section key={si} style={{ marginTop: si > 0 ? 36 : 0 }}>
                  <div className="gd-section-heading">{section.title}</div>
                  <div className="gd-doc-table-wrap">
                    <table className="gd-doc-table">
                      <thead>
                        <tr>
                          <th style={{ width: "30%" }}>제품</th>
                          <th>요약</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, ri) => (
                          <tr key={ri}>
                            <td className="name">{row.name}</td>
                            <td className="desc">
                              <EditableCell
                                value={row.desc}
                                onSave={(newDesc) => handleSaveRowDesc(si, ri, newDesc)}
                                onDelete={() => handleDeleteRow(si, ri)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            ) : (
              <div className="gd-doc-empty">
                <p>요약 내용이 비어 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
