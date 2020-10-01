import md5 from "md5";

function convertEmailToUrlGravatar(email: string) {
  email = email.trim();
  email = email.toLowerCase();
  
  const hashEmail = md5(email);
  const url = `https://www.gravatar.com/avatar/${hashEmail}?d=retro&r=g`;

  return url;
}

export default convertEmailToUrlGravatar;
