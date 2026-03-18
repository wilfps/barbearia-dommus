"use client";

type BirthDateInputProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function BirthDateInput({
  name,
  defaultValue = "",
  placeholder = "Data de nascimento (dd/mm/aaaa)",
  className,
  required,
  disabled,
}: BirthDateInputProps) {
  return (
    <input
      name={name}
      type="text"
      inputMode="numeric"
      maxLength={10}
      defaultValue={formatBirthDateInput(defaultValue)}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
      onInput={(event) => {
        const input = event.currentTarget;
        input.value = formatBirthDateInput(input.value);
      }}
    />
  );
}
