const transporter = require('../config/email');

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"AD Workspace" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

module.exports = { sendEmail };
