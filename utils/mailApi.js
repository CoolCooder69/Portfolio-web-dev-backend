const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
  process.env.SG_API
);

const sgMailClient = require("@sendgrid/client");
sgMailClient.setApiKey(
  process.env.SG_API
);


module.exports =  {sgMail, sgMailClient}; 