import path from 'path';
import nodemailer from 'nodemailer';

const hbs = require('nodemailer-express-handlebars');
const { emailServiceData } = require('../../.env');

let transport = nodemailer.createTransport({
  host: emailServiceData.host,
  port: emailServiceData.host,
  auth: {
    user: emailServiceData.user,
    pass: emailServiceData.pass
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
