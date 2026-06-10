import React, { useState, useEffect } from "react";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthField from "../components/AuthField.jsx";
import { IconGoogle, IconNaver, IconKakao } from "../components/Icons.jsx";
import { validateLogin } from "../data/validate.js";
import { loginApi } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = "http://localhost:8000";

export default function Login() {
  // authLoading: 앱 시작 시 /auth/me 검증 완료 여부
  // submitting: 로그인 버튼 클릭 후 API 응답 대기 여부
  const { user, loading: authLoading, login } = useAuth();
  const [form, setForm] = useState({ user_id: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    const msg = {
      google_cancelled: "Google 로그인이 취소되었습니다.",
      google_failed: "Google 로그인에 실패했습니다. 다시 시도해 주세요.",
    };
    setErrors({ oauth: msg[err] ?? "소셜 로그인 중 오류가 발생했습니다." });
  }, [searchParams]);

  // 인증 상태 확인 전 렌더링 방지 (깜빡임 방지)
  if (authLoading) return null;
  // 이미 로그인된 경우 역할에 따라 리다이렉트
  if (user) return <Navigate to={user.role === "SUPER_ADMIN" ? "/superAdmin" : "/home"} replace />;

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async () => {
    const e = validateLogin(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const res = await loginApi(form);
      console.log("[로그인 성공]", res);
      login(res.user);
      // SUPER_ADMIN은 관리자 페이지로, 나머지는 메인으로
      navigate(res.user.role === "SUPER_ADMIN" ? "/superAdmin" : "/home", { replace: true });
    } catch (err) {
      console.error("[로그인 실패]", err.message);
      setErrors({ password: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const onKey = (ev) => {
    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) onSubmit();
  };

  return (
    <AuthLayout kicker="다시 오신 걸 환영해요" title="로그인" subtitle="계정에 로그인하고 검색 기록을 이어가세요.">
      <div className="gd-auth-form" onKeyDown={onKey}>
        <AuthField
          id="login-user-id"
          label="아이디"
          value={form.user_id}
          onChange={set("user_id")}
          placeholder="아이디를 입력하세요"
          error={errors.user_id}
          autoComplete="username"
        />
        <div className="gd-field-headrow">
          <label className="gd-field-label" htmlFor="login-pw">비밀번호</label>
          <a className="gd-auth-mini" href="#" onClick={(e) => e.preventDefault()}>비밀번호 찾기</a>
        </div>
        <AuthField
          id="login-pw"
          label=""
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder="••••••••"
          error={errors.password}
          autoComplete="current-password"
        />
        <button className="gd-auth-btn" onClick={onSubmit} disabled={submitting}>
          {submitting ? <span className="gd-spin-sm" /> : null}
          {submitting ? "로그인 중…" : "로그인"}
        </button>
        <div className="gd-auth-divider"><span>또는</span></div>
        {errors.oauth && (
          <p style={{ color: "#f87171", fontSize: "13px", textAlign: "center", margin: "0 0 4px" }}>
            {errors.oauth}
          </p>
        )}
        <button
          className="gd-oauth-btn"
          onClick={() => { window.location.href = `${API_BASE}/auth/google/init`; }}
        >
          <IconGoogle /> Google로 계속하기
        </button>
        <button className="gd-oauth-btn" disabled title="준비 중">
          <IconNaver /> Naver로 계속하기
        </button>
        <button className="gd-oauth-btn" disabled title="준비 중">
          <IconKakao /> Kakao로 계속하기
        </button>
        <p className="gd-auth-switch">
          아직 계정이 없으신가요? <Link to="/signup">회원가입 하기</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
