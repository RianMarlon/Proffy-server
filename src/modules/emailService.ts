import path from 'path';
import nodemailer from 'nodemailer';

const hbs = require('nodemailer-express-handlebars');
const { host, port, user, pass } = require('../config/emailService.json');

let transport = nodemailer.createTransport({
  host,
  port,
  auth: {
    user,
    pass
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
