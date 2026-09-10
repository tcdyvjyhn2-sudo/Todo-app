import { HOURS_12, MINUTES_5, to12Hour, from12Hour } from '../utils/recurrence';

// Three tap/select-only dropdowns (hour, minute, AM/PM) composing a single
// "HH:MM" (24-hour) value - no typing or keyboard entry required.
export default function TimeOfDaySelects({ timeOfDay, onChange, labelPrefix, className, style }) {
  const { hour12, minute, period } = to12Hour(timeOfDay);
  const selectClassName = className ?? 'add-task-interval';

  function update(nextHour12, nextMinute, nextPeriod) {
    onChange(from12Hour(nextHour12, nextMinute, nextPeriod));
  }

  return (
    <>
      <select
        className={selectClassName}
        style={style}
        value={hour12}
        onChange={(e) => update(Number(e.target.value), minute, period)}
        aria-label={`${labelPrefix} - hour`}
      >
        {HOURS_12.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        style={style}
        value={minute}
        onChange={(e) => update(hour12, e.target.value, period)}
        aria-label={`${labelPrefix} - minute`}
      >
        {MINUTES_5.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        style={style}
        value={period}
        onChange={(e) => update(hour12, minute, e.target.value)}
        aria-label={`${labelPrefix} - AM or PM`}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </>
  );
}
