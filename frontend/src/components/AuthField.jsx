import React from "react";

// 라벨 + 입력 + 에러 메시지를 묶은 재사용 필드
export default function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  autoComplete,
}) {
  return (
    <div className={"gd-field" + (error ? " has-error" : "")}>
      {label ? <label className="gd-field-label" htmlFor={id}>{label}</label> : null}
      <input
        id={id}
        className="gd-field-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {error && (
        <span className="gd-field-error" id={`${id}-err`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
