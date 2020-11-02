import path from 'path';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const hbs = require('nodemailer-express-handlebars');

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST,
  port: Number(process.env.EMAIL_SERVICE_PORT),
  auth: {
    type: process.env.EMAIL_SERVICE_TYPE as any,
    user: process.env.EMAIL_SERVICE_USER,
    clientId: process.env.EMAIL_SERVICE_CLIENT_ID,
    clientSecret: process.env.EMAIL_SERVICE_CLIENT_SECRET,
    refreshToken: process.env.EMAIL_SERVICE_REFRESH_TOKEN,
    accessToken: process.env.EMAIL_SERVICE_ACCESS_TOKEN,
  },
  tls: { rejectUnauthorized: false }
});

transport.use('compile', hbs({
  viewEngine: {
    defaultLayout: undefined,
    partialsDir: path.resolve('./src/resources/emailTemplates/')
  },
  viewPath: path.resolve('./src/resources/emailTemplates/'),
  extName: '.html'
}));

export default transport;
