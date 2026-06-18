import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthField from "../components/AuthField.jsx";
import { checkIdentity, resetPassword } from "../api/auth.js";
import { validateForgotStep1, validateForgotStep2 } from "../data/validate.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 상태
  const [identity, setIdentity] = useState({ user_id: "", email: "" });
  const [identityErrors, setIdentityErrors] = useState({});

  // Step 2 상태
  const [passwords, setPasswords] = useState({ new_password: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const setIdentityField = (key) => (val) => {
    setIdentity((f) => ({ ...f, [key]: val }));
    if (identityErrors[key]) setIdentityErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setPasswordField = (key) => (val) => {
    setPasswords((f) => ({ ...f, [key]: val }));
    if (passwordErrors[key]) setPasswordErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onStep1Submit = async () => {
    const e = validateForgotStep1(identity);
    setIdentityErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      await checkIdentity(identity);
      setStep(2);
    } catch (err) {
      setIdentityErrors({ email: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const onStep2Submit = async () => {
    const e = validateForgotStep2(passwords);
    setPasswordErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      await resetPassword({ ...identity, new_password: passwords.new_password });
      setDone(true);
    } catch (err) {
      setPasswordErrors({ new_password: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const onKey = (handler) => (ev) => {
    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) handler();
  };

  if (done) {
    return (
      <AuthLayout kicker="완료" title="비밀번호 변경 완료" subtitle="새 비밀번호로 로그인하세요.">
        <div className="gd-auth-form">
          <div style={{
            textAlign: "center",
            padding: "24px 0 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(54,224,161,.12)",
              border: "1.5px solid rgba(54,224,161,.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="var(--mint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ color: "var(--dim)", fontSize: "14px", margin: 0, lineHeight: 1.6 }}>
              비밀번호가 성공적으로 변경되었습니다.
            </p>
          </div>
          <button className="gd-auth-btn" onClick={() => navigate("/login", { replace: true })}>
            로그인으로 이동
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 1) {
    return (
      <AuthLayout
        kicker="비밀번호 찾기"
        title="본인 확인"
        subtitle="가입 시 사용한 아이디와 이메일을 입력하세요."
      >
        <div className="gd-auth-form" onKeyDown={onKey(onStep1Submit)}>
          <AuthField
            id="fp-user-id"
            label="아이디"
            value={identity.user_id}
            onChange={setIdentityField("user_id")}
            placeholder="아이디를 입력하세요"
            error={identityErrors.user_id}
            autoComplete="username"
          />
          <AuthField
            id="fp-email"
            label="이메일"
            type="email"
            value={identity.email}
            onChange={setIdentityField("email")}
            placeholder="가입 시 사용한 이메일"
            error={identityErrors.email}
            autoComplete="email"
          />
          <button className="gd-auth-btn" onClick={onStep1Submit} disabled={submitting}>
            {submitting ? <span className="gd-spin-sm" /> : null}
            {submitting ? "확인 중…" : "다음"}
          </button>
          <p className="gd-auth-switch">
            <Link to="/login">← 로그인으로 돌아가기</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      kicker="비밀번호 재설정"
      title="새 비밀번호 설정"
      subtitle="사용할 새 비밀번호를 입력하세요."
    >
      <div className="gd-auth-form" onKeyDown={onKey(onStep2Submit)}>
        <AuthField
          id="fp-new-pw"
          label="새 비밀번호"
          type="password"
          value={passwords.new_password}
          onChange={setPasswordField("new_password")}
          placeholder="8자 이상"
          error={passwordErrors.new_password}
          autoComplete="new-password"
        />
        <AuthField
          id="fp-confirm"
          label="비밀번호 확인"
          type="password"
          value={passwords.confirm}
          onChange={setPasswordField("confirm")}
          placeholder="비밀번호를 다시 입력"
          error={passwordErrors.confirm}
          autoComplete="new-password"
        />
        <button className="gd-auth-btn" onClick={onStep2Submit} disabled={submitting}>
          {submitting ? <span className="gd-spin-sm" /> : null}
          {submitting ? "변경 중…" : "비밀번호 변경"}
        </button>
        <p className="gd-auth-switch">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setStep(1); setPasswordErrors({}); }}
            style={{ color: "var(--dim)" }}
          >
            ← 이전 단계
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
