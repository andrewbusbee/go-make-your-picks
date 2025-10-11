interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
  timezone?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  className = "",
  required = false,
  placeholder = "Select date and time"
}: DateTimePickerProps) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      required={required}
      placeholder={placeholder}
    />
  );
}
