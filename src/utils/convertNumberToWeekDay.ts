export default function convertNumberToWeekDay(day: number) {
  switch(day) {
    case 0:
      return 'Domingo';
    case 1:
      return 'Segunda-Feira';
    case 2:
      return 'Terça-feira';
    case 3:
      return 'Quarta-feira';
    case 4:
      return 'Quinta-feira';
    case 5:
      return 'Sexta-feira';
    case 6:
      return 'Sábado';
    default:
      return '';
  }
}
