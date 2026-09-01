type CaseType = 'nominative' | 'genitive';

interface TimeUnits {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// спс chatgpt

/**
 * Разбивает общее количество секунд на дни, часы, минуты и секунды
 */
function splitSeconds(totalSeconds: number): TimeUnits {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

/**
 * Возвращает правильную форму слова для числа
 */
function getWordForm(
  number: number,
  formsNominative: [string, string, string], // именительный падеж (кто? что?)
  formsGenitive: [string, string, string],   // родительный падеж (кого? чего?)
  caseType: CaseType = 'nominative'
): string {
  const forms = caseType === 'genitive' ? formsGenitive : formsNominative;

  if(number % 10 === 1 && number % 100 !== 11) {
    return forms[0]; // единственное число (1, 21, 31...)
  }
  if(number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 10 || number % 100 >= 20)) {
    return forms[1]; // множественное число для 2-4 (2, 3, 4, 22, 23, 24...)
  }
  return forms[2]; // множественное число для остальных
}

/**
 * Форматирует количество секунд в читаемый текст
 */
function formatSeconds(seconds: number, caseType: CaseType = 'nominative'): string {
  if(seconds == 0) return '0 секунд';

  const units = splitSeconds(seconds);
  const parts: string[] = [];

  // Формы для именительного падежа (кто? что?)
  const dayFormsNominative: [string, string, string] = ['день', 'дня', 'дней'];
  const hourFormsNominative: [string, string, string] = ['час', 'часа', 'часов'];
  const minuteFormsNominative: [string, string, string] = ['минута', 'минуты', 'минут'];
  const secondFormsNominative: [string, string, string] = ['секунда', 'секунды', 'секунд'];

  // Формы для родительного падежа (кого? чего?)
  const dayFormsGenitive: [string, string, string] = ['дня', 'дней', 'дней'];
  const hourFormsGenitive: [string, string, string] = ['часа', 'часов', 'часов'];
  const minuteFormsGenitive: [string, string, string] = ['минуты', 'минут', 'минут'];
  const secondFormsGenitive: [string, string, string] = ['секунду', 'секунды', 'секунд'];

  if(units.days > 0)
    parts.push(`${units.days} ${getWordForm(units.days, dayFormsNominative, dayFormsGenitive, caseType)}`);

  if(units.hours > 0)
    parts.push(`${units.hours} ${getWordForm(units.hours, hourFormsNominative, hourFormsGenitive, caseType)}`);

  if(units.minutes > 0)
    parts.push(`${units.minutes} ${getWordForm(units.minutes, minuteFormsNominative, minuteFormsGenitive, caseType)}`);

  if(units.seconds > 0 || parts.length === 0)
    parts.push(`${units.seconds} ${getWordForm(units.seconds, secondFormsNominative, secondFormsGenitive, caseType)}`);

  return parts.join(' ');
}

/**
 * Основная функция для получения отформатированного времени
 */
export default function(seconds: number, caseType: CaseType = 'nominative'): string {
  if(!Number.isInteger(seconds) || seconds < 0) {
    throw new Error('Входное значение должно быть неотрицательным целым числом');
  }

  return formatSeconds(seconds, caseType);
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
