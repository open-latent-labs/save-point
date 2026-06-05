import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import AuthField from "../components/AuthField.jsx";
import { IconGoogle, IconCheck } from "../components/Icons.jsx";
import { validateSignup } from "../data/validate.js";

export default function Signup() {
  const [form, setForm] = useState({ name: "", nickname: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = () => {
    const e = validateSignup(form);
    setErrors(e);
    if (Object.keys(e).length) return;
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
      <AuthLayout kicker="가입 완료" title={`반가워요, ${form.name}님`} subtitle="계정이 생성되었습니다. (mock)">
        <div className="gd-auth-success">
          <span className="ok"><IconCheck width="22" height="22" /></span>
          <p>이제 로그인하고 GameDocs.AI 를 사용해 보세요.</p>
          <Link to="/login" className="gd-auth-btn as-link">로그인하러 가기</Link>
        </div>
      </AuthLayout>
    );
  }

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
          id="su-nickname"
          label="닉네임"
          value={form.nickname}
          onChange={set("nickname")}
          placeholder="게임 개발자"
          error={errors.nickname}
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

        <button className="gd-auth-btn" onClick={onSubmit} disabled={loading}>
          {loading ? <span className="gd-spin-sm" /> : null}
          {loading ? "가입 중…" : "회원가입"}
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
