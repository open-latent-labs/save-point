import React from "react";
import { useParams, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import { getDocContent } from "../data/docsData.js";

export default function Docs() {
  const { docId = "atlassian-intro" } = useParams();
  const { onMenu, onProfile } = useOutletContext();
  const doc = getDocContent(docId);

  return (
    <div className="gd-page">
      <Topbar onMenu={onMenu} onProfile={onProfile} />
      <div className="gd-page-scroll">
        <div className="gd-doc-wrap">
          <div className="gd-doc-card">
            {/* 브레드크럼 */}
            <nav className="gd-breadcrumb">
              {doc.breadcrumb.map((item, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span className="gd-breadcrumb-sep">/</span>}
                  <span className={i === doc.breadcrumb.length - 1 ? "gd-breadcrumb-item last" : "gd-breadcrumb-item"}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>

            {/* 제목 */}
            <h1 className="gd-doc-title">{doc.title}</h1>

            {/* 메타 */}
            {doc.meta && <p className="gd-doc-meta">{doc.meta}</p>}

            {/* 설명 */}
            <p className="gd-doc-desc">{doc.desc}</p>

            {/* 섹션 테이블 */}
            {doc.sections.length > 0 ? (
              doc.sections.map((section, si) => (
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
                            <td className="desc">{row.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            ) : (
              <div className="gd-doc-empty">
                <p>이 페이지의 내용은 아직 작성 중입니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
