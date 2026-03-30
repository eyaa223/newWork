import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"DonAct" <${process.env.EMAIL}>`,
    to,
    subject,
    html
  });
};