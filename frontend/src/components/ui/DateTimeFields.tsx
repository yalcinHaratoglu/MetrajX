import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";

interface DateTimeFieldsProps {
  dateLabel: string;
  timeLabel: string;
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateRequired?: boolean;
}

export function DateTimeFields({
  dateLabel,
  timeLabel,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateRequired,
}: DateTimeFieldsProps) {
  return (
    <div className="datetime-field-row">
      <DatePicker
        label={dateLabel}
        value={dateValue}
        onChange={onDateChange}
        required={dateRequired}
      />
      <TimePicker label={timeLabel} value={timeValue} onChange={onTimeChange} />
    </div>
  );
}
