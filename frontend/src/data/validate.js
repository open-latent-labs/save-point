// 인증 폼 검증 헬퍼 (mock)
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = "이메일을 입력해 주세요.";
  else if (!isEmail(email)) e.email = "올바른 이메일 형식이 아니에요.";
  if (!password) e.password = "비밀번호를 입력해 주세요.";
  return e;
}

export function validateSignup({ name, nickname, email, password, confirm }) {
  const e = {};
  if (!name.trim()) e.name = "이름을 입력해 주세요.";
  if (!nickname.trim()) e.nickname = "닉네임을 입력해 주세요.";
  else if (nickname.trim().length < 2) e.nickname = "닉네임은 2자 이상이어야 해요.";
  if (!email.trim()) e.email = "이메일을 입력해 주세요.";
  else if (!isEmail(email)) e.email = "올바른 이메일 형식이 아니에요.";
  if (!password) e.password = "비밀번호를 입력해 주세요.";
  else if (password.length < 8) e.password = "비밀번호는 8자 이상이어야 해요.";
  if (!confirm) e.confirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (confirm !== password) e.confirm = "비밀번호가 일치하지 않아요.";
  return e;
}
