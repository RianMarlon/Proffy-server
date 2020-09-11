
function existOrError(value: any, msg: string) {
  if (!value) throw msg;
  if (Array.isArray(value) && value.length == 0) throw msg;
  if (typeof value === 'string' && !value.trim()) throw msg;
}

function notExistOrError(value: any, msg: string) {
  try {
    existOrError(value, msg);
  }

  catch(err) {
    return;
  }

  throw msg;
}

function equalOrError(valueA: any, valueB: any, msg: string) {
  if(valueA !== valueB) throw msg;
}

function validEmailOrError(email: string, msg: string) {
  const regexValidateEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const isValidEmail = regexValidateEmail.test(email);

  if(!isValidEmail) {
    throw msg;
  }
}

export {
  existOrError,
  notExistOrError,
  equalOrError,
  validEmailOrError
}
