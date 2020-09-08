
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

export {
  existOrError,
  notExistOrError,
  equalOrError
}
