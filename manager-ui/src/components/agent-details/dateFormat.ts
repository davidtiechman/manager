import type { DateValue } from '../../types/agentResponse';

export function formatDate(value: DateValue) {
  return new Date(value).toLocaleString('he-IL');
}

export function formatOptionalDate(value?: DateValue) {
  return value ? formatDate(value) : '';
}
