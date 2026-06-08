const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #4F46E5; color: #fff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
    .button { display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
    .footer { padding: 16px 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>AD Workspace</h1></div>
    <div class="body">${content}</div>
    <div class="footer">&copy; ${new Date().getFullYear()} AD Workspace. All rights reserved.</div>
  </div>
</body>
</html>
`;

const welcomeEmail = (name, email, password) => baseTemplate(`
  <h2>Welcome to AD Workspace, ${name}!</h2>
  <p>Your account has been created. Here are your login credentials:</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Password:</strong> ${password}</p>
  <p>Please change your password after your first login for security.</p>
  <a href="#" class="button">Login Now</a>
`);

const taskAssignedEmail = (name, taskTitle, assignedBy) => baseTemplate(`
  <h2>New Task Assigned</h2>
  <p>Hi ${name},</p>
  <p><strong>${assignedBy}</strong> has assigned you a new task:</p>
  <p style="background:#f1f5f9; padding:16px; border-radius:8px; font-size:18px;"><strong>${taskTitle}</strong></p>
  <a href="#" class="button">View Task</a>
`);

const leaveRequestEmail = (managerName, employeeName, leaveType, startDate, endDate) => baseTemplate(`
  <h2>Leave Request</h2>
  <p>Hi ${managerName},</p>
  <p><strong>${employeeName}</strong> has requested leave:</p>
  <ul>
    <li><strong>Type:</strong> ${leaveType}</li>
    <li><strong>From:</strong> ${startDate}</li>
    <li><strong>To:</strong> ${endDate}</li>
  </ul>
  <a href="#" class="button">Review Request</a>
`);

const leaveReviewEmail = (name, status, reviewNote) => baseTemplate(`
  <h2>Leave ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
  <p>Hi ${name},</p>
  <p>Your leave request has been <strong style="color:${status === 'approved' ? '#22c55e' : '#ef4444'}">${status}</strong>.</p>
  ${reviewNote ? `<p><strong>Note:</strong> ${reviewNote}</p>` : ''}
  <a href="#" class="button">View Details</a>
`);

const resetPasswordEmail = (name, resetToken) => baseTemplate(`
  <h2>Password Reset</h2>
  <p>Hi ${name},</p>
  <p>You requested a password reset. Click the button below:</p>
  <a href="#" class="button">Reset Password</a>
  <p>If you didn't request this, please ignore this email.</p>
`);

const expenseStatusEmail = (name, title, status) => baseTemplate(`
  <h2>Expense Claim ${status}</h2>
  <p>Hi ${name},</p>
  <p>Your expense claim "<strong>${title}</strong>" has been <strong style="color:${status === 'approved' ? '#22c55e' : status === 'rejected' ? '#ef4444' : '#0ea5e9'}">${status}</strong>.</p>
  <a href="#" class="button">View Details</a>
`);

const ticketUpdateEmail = (name, ticketId, status) => baseTemplate(`
  <h2>Ticket Update</h2>
  <p>Hi ${name},</p>
  <p>Your ticket <strong>${ticketId}</strong> status has been updated to <strong>${status}</strong>.</p>
  <a href="#" class="button">View Ticket</a>
`);

module.exports = {
  welcomeEmail,
  taskAssignedEmail,
  leaveRequestEmail,
  leaveReviewEmail,
  resetPasswordEmail,
  expenseStatusEmail,
  ticketUpdateEmail,
};
