type StatusIconVariant = "paid" | "pending" | "canceled";

type StatusIconProps = {
  variant: StatusIconVariant;
  className?: string;
};

export function StatusIcon({ variant, className = "" }: StatusIconProps) {
  const classes = `status-icon ${className}`.trim();
  const palette =
    variant === "paid"
      ? {
          color: "#3ddc84",
          border: "1.5px solid rgba(61, 220, 132, 0.92)",
          background:
            "radial-gradient(circle at 30% 25%, rgba(180, 255, 213, 0.2), transparent 45%), rgba(61, 220, 132, 0.08)",
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 18px rgba(61, 220, 132, 0.24), 0 8px 18px rgba(0, 0, 0, 0.16)",
        }
      : variant === "pending"
        ? {
            color: "#d9a441",
            border: "1.5px solid rgba(217, 164, 65, 0.92)",
            background:
              "radial-gradient(circle at 30% 25%, rgba(255, 236, 163, 0.18), transparent 45%), rgba(217, 164, 65, 0.08)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 18px rgba(217, 164, 65, 0.24), 0 8px 18px rgba(0, 0, 0, 0.16)",
          }
        : {
            color: "#e14b4b",
            border: "1.5px solid rgba(225, 75, 75, 0.92)",
            background:
              "radial-gradient(circle at 30% 25%, rgba(255, 181, 181, 0.16), transparent 45%), rgba(225, 75, 75, 0.08)",
            boxShadow:
              "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0 18px rgba(225, 75, 75, 0.24), 0 8px 18px rgba(0, 0, 0, 0.16)",
          };

  return (
    <span
      className={classes}
      aria-hidden="true"
      style={{
        width: "40px",
        minWidth: "40px",
        height: "40px",
        minHeight: "40px",
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        color: palette.color,
        border: palette.border,
        background: palette.background,
        boxShadow: palette.boxShadow,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <span
        className="status-icon__core"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "26px",
          minWidth: "26px",
          height: "26px",
          minHeight: "26px",
          borderRadius: "999px",
          background: "rgba(0, 0, 0, 0.14)",
          boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        }}
      >
        {variant === "paid" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            style={{
              width: "18px",
              height: "18px",
              display: "block",
              overflow: "visible",
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.22))",
            }}
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        ) : variant === "pending" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            style={{
              width: "18px",
              height: "18px",
              display: "block",
              overflow: "visible",
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.22))",
            }}
          >
            <path
              d="M6 12h12"
              stroke="currentColor"
              strokeWidth="2.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            style={{
              width: "18px",
              height: "18px",
              display: "block",
              overflow: "visible",
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.22))",
            }}
          >
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="currentColor"
              strokeWidth="2.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </span>
    </span>
  );
}
