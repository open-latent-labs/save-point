import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthField from "../components/AuthField.jsx";
import { IconGoogle } from "../components/Icons.jsx";
import { validateSignup } from "../data/validate.js";
import { signup as apiSignup } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  // authLoading: 앱 시작 시 /auth/me 검증 완료 여부
  // submitting: 회원가입 버튼 클릭 후 API 응답 대기 여부
  const { user, loading: authLoading, login } = useAuth();
  const [form, setForm] = useState({ name: "", user_id: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // 인증 상태 확인 전 렌더링 방지
  if (authLoading) return null;
  // 이미 로그인된 경우 역할에 따라 리다이렉트
  if (user) return <Navigate to={user.role === "SUPER_ADMIN" ? "/superAdmin" : "/home"} replace />;

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async () => {
    const e = validateSignup(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const res = await apiSignup(form);
      console.log("[회원가입 성공]", res);
      // 서버에서 쿠키 발급 완료 — 유저 상태 갱신 후 메인으로 이동
      login(res);
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("[회원가입 실패]", err.message);
      const msg = err.message;
      if (msg.includes("아이디")) setErrors({ user_id: msg });
      else if (msg.includes("이메일")) setErrors({ email: msg });
      else setErrors({ email: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const onKey = (ev) => {
    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) onSubmit();
  };

  return (
    <AuthLayout kicker="무료로 시작하기" title="회원가입" subtitle="몇 초면 끝나요. 게임 문서 검색을 시작하세요.">
      <div className="gd-auth-form" onKeyDown={onKey}>
        <AuthField
          id="su-name"
          label="이름"
          value={form.name}
          onChange={set("name")}
          placeholder="홍길동"
          error={errors.name}
          autoComplete="name"
        />
        <AuthField
          id="su-user_id"
          label="아이디"
          value={form.user_id}
          onChange={set("user_id")}
          placeholder="영문, 숫자, _ (4~20자)"
          error={errors.user_id}
          autoComplete="username"
        />
        <AuthField
          id="su-email"
          label="이메일"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@studio.com"
          error={errors.email}
          autoComplete="email"
        />
        <AuthField
          id="su-pw"
          label="비밀번호"
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder="8자 이상"
          error={errors.password}
          autoComplete="new-password"
        />
        <AuthField
          id="su-confirm"
          label="비밀번호 확인"
          type="password"
          value={form.confirm}
          onChange={set("confirm")}
          placeholder="비밀번호를 다시 입력"
          error={errors.confirm}
          autoComplete="new-password"
        />
        <button className="gd-auth-btn" onClick={onSubmit} disabled={submitting}>
          {submitting ? <span className="gd-spin-sm" /> : null}
          {submitting ? "가입 중…" : "회원가입"}
        </button>
        <div className="gd-auth-divider"><span>또는</span></div>
        <button className="gd-oauth-btn" onClick={() => alert("Google 가입은 데모입니다.")}>
          <IconGoogle /> Google로 계속하기
        </button>
        <p className="gd-auth-switch">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
