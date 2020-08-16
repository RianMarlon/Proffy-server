export default function convertMinutesToTime(minutes: number) {
  const minute = minutes % 60;
  const hour = (minutes - minute) / 60;

  const minuteString = `${minute > 9 ? minute : '0' + minute}`;
  const hourString = `${hour > 9 ? hour : '0' + hour}`;

  return `${hourString}:${minuteString}`;
}
