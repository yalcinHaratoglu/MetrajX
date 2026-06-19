import { Dropdown, type DropdownOption } from "./Dropdown";

interface SelectProps<T extends string = string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  className?: string;
  ariaLabel?: string;
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  className = "",
  ariaLabel,
}: SelectProps<T>) {
  return (
    <Dropdown
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      className={className}
      ariaLabel={ariaLabel}
    />
  );
}

export type { DropdownOption };
