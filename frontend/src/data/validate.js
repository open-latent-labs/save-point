// 인증 폼 클라이언트 검증 헬퍼 — 서버 요청 전 빠른 피드백 제공
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

const hasLetter = (v) => /[a-zA-Z]/.test(v);
const hasDigit = (v) => /[0-9]/.test(v);
const hasSpace = (v) => /\s/.test(v);

function validatePassword(v, field = "password") {
  const e = {};
  if (!v) { e[field] = "비밀번호를 입력해 주세요."; return e; }
  if (hasSpace(v)) { e[field] = "비밀번호에 공백은 사용할 수 없어요."; return e; }
  if (v.length < 8) { e[field] = "비밀번호는 8자 이상이어야 해요."; return e; }
  if (!hasLetter(v) || !hasDigit(v)) { e[field] = "영문과 숫자를 모두 포함해야 해요."; return e; }
  return e;
}

// 로그인: 이메일 대신 user_id로 인증
export function validateLogin({ user_id, password }) {
  const e = {};
  if (!user_id?.trim()) e.user_id = "아이디를 입력해 주세요.";
  if (!password) e.password = "비밀번호를 입력해 주세요.";
  return e;
}

export function validateForgotStep1({ user_id, email }) {
  const e = {};
  if (!user_id?.trim()) e.user_id = "아이디를 입력해 주세요.";
  if (!email?.trim()) e.email = "이메일을 입력해 주세요.";
  else if (!isEmail(email)) e.email = "올바른 이메일 형식이 아니에요.";
  return e;
}

export function validateForgotStep2({ new_password, confirm }) {
  const e = { ...validatePassword(new_password, "new_password") };
  if (Object.keys(e).length === 0) {
    if (!confirm) e.confirm = "비밀번호를 한 번 더 입력해 주세요.";
    else if (confirm !== new_password) e.confirm = "비밀번호가 일치하지 않아요.";
  }
  return e;
}

// 회원가입: user_id 형식은 백엔드 정규식과 동일하게 유지 (^[a-zA-Z0-9_]{4,20}$)
export function validateSignup({ name, user_id, email, password, confirm }) {
  const e = {};
  if (!name.trim()) e.name = "이름을 입력해 주세요.";
  if (!user_id.trim()) e.user_id = "아이디를 입력해 주세요.";
  else if (!/^[a-zA-Z0-9_]{4,20}$/.test(user_id.trim())) e.user_id = "영문, 숫자, _ 만 사용 가능 (4~20자)";
  if (!email.trim()) e.email = "이메일을 입력해 주세요.";
  else if (!isEmail(email)) e.email = "올바른 이메일 형식이 아니에요.";
  Object.assign(e, validatePassword(password, "password"));
  if (!e.password) {
    if (!confirm) e.confirm = "비밀번호를 한 번 더 입력해 주세요.";
    else if (confirm !== password) e.confirm = "비밀번호가 일치하지 않아요.";
  }
  return e;
}
