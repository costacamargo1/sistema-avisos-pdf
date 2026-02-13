const weekDays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];

function dateToPartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const values = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function partsToUtcDate(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

function utcDateToParts(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isBusinessDay(weekDay) {
  return weekDay >= 1 && weekDay <= 5;
}

function normalizeToBusinessDay(parts, direction = 'next') {
  const date = partsToUtcDate(parts);
  const step = direction === 'previous' ? -1 : 1;

  let guard = 0;
  while (!isBusinessDay(date.getUTCDay()) && guard < 10) {
    date.setUTCDate(date.getUTCDate() + step);
    guard += 1;
  }

  return utcDateToParts(date);
}

function businessDayCountUntil(parts) {
  const start = new Date(Date.UTC(parts.year, 0, 1, 12, 0, 0));
  const end = partsToUtcDate(parts);

  let count = 0;
  while (start <= end) {
    if (isBusinessDay(start.getUTCDay())) {
      count += 1;
    }
    start.setUTCDate(start.getUTCDate() + 1);
  }

  return count;
}

function toIso(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function getWeekDayLabel(parts) {
  const weekDay = partsToUtcDate(parts).getUTCDay();
  return weekDays[weekDay] || 'Dia util';
}

function getNextBusinessDay(parts) {
  const next = partsToUtcDate(parts);
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (!isBusinessDay(next.getUTCDay()));
  return utcDateToParts(next);
}

export function resolveMessageOfDay(messages, now = new Date(), timeZone = 'America/Sao_Paulo') {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const todayParts = dateToPartsInTimeZone(now, timeZone);
  const businessParts = normalizeToBusinessDay(todayParts, 'next');
  const businessDayIndex = Math.max(0, businessDayCountUntil(businessParts) - 1);
  const messageIndex = businessDayIndex % messages.length;
  const nextBusinessParts = getNextBusinessDay(businessParts);
  const nextMessageIndex = (messageIndex + 1) % messages.length;

  return {
    date: toIso(todayParts),
    businessDate: toIso(businessParts),
    weekDay: getWeekDayLabel(businessParts),
    nextBusinessDate: toIso(nextBusinessParts),
    nextWeekDay: getWeekDayLabel(nextBusinessParts),
    messageIndex,
    message: messages[messageIndex],
    nextMessage: messages[nextMessageIndex],
  };
}

