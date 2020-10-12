import path from 'path';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const hbs = require('nodemailer-express-handlebars');

let transport = nodemailer.createTransport({
  host: process.env.EMAIL_SERVICE_HOST,
  port: process.env.EMAIL_SERVICE_PORT,
  auth: {
    user: process.env.EMAIL_SERVICE_USER,
    pass: process.env.EMAIL_SERVICE_PASS
  }
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
