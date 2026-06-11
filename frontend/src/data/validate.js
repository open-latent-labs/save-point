// 인증 폼 클라이언트 검증 헬퍼 — 서버 요청 전 빠른 피드백 제공
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

// 로그인: 이메일 대신 user_id로 인증
export function validateLogin({ user_id, password }) {
  const e = {};
  if (!user_id?.trim()) e.user_id = "아이디를 입력해 주세요.";
  if (!password) e.password = "비밀번호를 입력해 주세요.";
  return e;
}

// 회원가입: user_id 형식은 백엔드 정규식과 동일하게 유지 (^[a-zA-Z0-9_]{4,20}$)
export function validateSignup({ name, user_id, email, password, confirm }) {
  const e = {};
  if (!name.trim()) e.name = "이름을 입력해 주세요.";
  if (!user_id.trim()) e.user_id = "아이디를 입력해 주세요.";
  else if (!/^[a-zA-Z0-9_]{4,20}$/.test(user_id)) e.user_id = "영문, 숫자, _ 만 사용 가능 (4~20자)";
  if (!email.trim()) e.email = "이메일을 입력해 주세요.";
  else if (!isEmail(email)) e.email = "올바른 이메일 형식이 아니에요.";
  if (!password) e.password = "비밀번호를 입력해 주세요.";
  else if (password.length < 8) e.password = "비밀번호는 8자 이상이어야 해요.";
  if (!confirm) e.confirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (confirm !== password) e.confirm = "비밀번호가 일치하지 않아요.";
  return e;
}
