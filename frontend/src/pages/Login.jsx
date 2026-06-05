import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthField from "../components/AuthField.jsx";
import { IconGoogle, IconCheck } from "../components/Icons.jsx";
import { validateLogin } from "../data/validate.js";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(1);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!done) return;
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          navigate("/home");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [done, navigate]);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = () => {
    const e = validateLogin(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    // mock 로그인
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 900);
  };

  const onKey = (ev) => {
    if (ev.key === "Enter" && !ev.nativeEvent.isComposing) onSubmit();
  };

  if (done) {
    return (
      <AuthLayout kicker="환영합니다" title="로그인 완료" subtitle={`${form.email} 으로 로그인했어요. (mock)`}>
        <div className="gd-auth-success">
          <span className="ok"><IconCheck width="22" height="22" /></span>
          <p>데모 로그인에 성공했습니다.</p>
          <p style={{ fontSize: 13, color: "var(--faint)", marginTop: 8 }}>
            {countdown}초 후 홈으로 이동합니다…
          </p>
          <Link to="/home" className="gd-auth-btn as-link" onClick={() => clearInterval(timerRef.current)}>
            지금 이동
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout kicker="다시 오신 걸 환영해요" title="로그인" subtitle="계정에 로그인하고 검색 기록을 이어가세요.">
      <div className="gd-auth-form" onKeyDown={onKey}>
        <AuthField
          id="login-email"
          label="이메일"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@studio.com"
          error={errors.email}
          autoComplete="email"
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

        <button className="gd-auth-btn" onClick={onSubmit} disabled={loading}>
          {loading ? <span className="gd-spin-sm" /> : null}
          {loading ? "로그인 중…" : "로그인"}
        </button>

        <div className="gd-auth-divider"><span>또는</span></div>

        <button className="gd-oauth-btn" onClick={() => alert("Google 로그인은 데모입니다.")}>
          <IconGoogle /> Google로 계속하기
        </button>

        <p className="gd-auth-switch">
          아직 계정이 없으신가요? <Link to="/signup">회원가입 하기</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
