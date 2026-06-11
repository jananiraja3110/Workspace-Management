const mongoose = require('mongoose');
const Task = require('../models/Task');
const { createNotification } = require('./createNotification');
const { sendEmail } = require('./sendEmail');

// ---------------------------------------------------------------------------
// Email template for due-date reminders
// ---------------------------------------------------------------------------
const taskDueTomorrowEmail = (name, taskTitle) => {
  const content = `
  <h2>Task Due Tomorrow</h2>
  <p>Hi ${name},</p>
  <p>This is a friendly reminder that the following task is due <strong>tomorrow</strong>:</p>
  <p style="background:#f1f5f9; padding:16px; border-radius:8px; font-size:18px;"><strong>${taskTitle}</strong></p>
  <p>Please make sure to complete it on time.</p>
  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/tasks" class="button">View Task</a>
`;

  // baseTemplate is not exported — inline the wrapper here
  return `
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
};

// ---------------------------------------------------------------------------
// Core reminder function
// ---------------------------------------------------------------------------
const sendDueDateReminders = async () => {
  try {
    // Guard: skip if mongoose is not yet connected
    if (mongoose.connection.readyState !== 1) {
      console.log('[DueDateReminder] DB not ready — skipping run.');
      return;
    }

    // Build date range for "tomorrow" in IST (UTC+5:30)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    // tomorrow midnight IST = UTC midnight IST + 1 day, then subtract offset back to UTC
    const startOfTomorrow = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate() + 1,
      0, 0, 0, 0
    ) - IST_OFFSET_MS);
    const endOfTomorrow = new Date(Date.UTC(
      nowIST.getUTCFullYear(),
      nowIST.getUTCMonth(),
      nowIST.getUTCDate() + 1,
      23, 59, 59, 999
    ) - IST_OFFSET_MS);

    // Find all non-terminal tasks due tomorrow with at least one assignee
    // Status enum: 'pending' | 'todo' | 'in-progress' | 'completed' | 'overdue'
    // We exclude 'completed' — overdue tasks still get a reminder since they're not done
    const tasks = await Task.find({
      dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
      status: { $nin: ['completed'] },
      assignedTo: { $exists: true, $ne: [] },
    }).populate('assignedTo', 'name email');

    if (tasks.length === 0) {
      console.log('[DueDateReminder] No tasks due tomorrow — nothing to send.');
      return;
    }

    let reminderCount = 0;

    for (const task of tasks) {
      for (const assignee of task.assignedTo) {
        // In-app notification
        await createNotification(
          assignee._id,
          'Task Due Tomorrow',
          `Task "${task.title}" is due tomorrow`,
          'task',
          '/tasks'
        );

        // Email notification
        if (assignee.email) {
          await sendEmail(
            assignee.email,
            'Task Due Tomorrow — Reminder',
            taskDueTomorrowEmail(assignee.name || 'there', task.title)
          );
        }

        reminderCount++;
      }
    }

    console.log(
      `[DueDateReminder] Sent ${reminderCount} reminder(s) for ${tasks.length} task(s) due tomorrow.`
    );
  } catch (error) {
    console.error('[DueDateReminder] Error:', error.message);
  }
};

// ---------------------------------------------------------------------------
// Scheduler: runs daily at ~09:00 UTC using setInterval
// ---------------------------------------------------------------------------
const scheduleDueDateReminders = () => {
  const MS_IN_DAY = 24 * 60 * 60 * 1000;

  // Calculate milliseconds until next 09:00 IST (03:30 UTC)
  const msUntilFirstRun = () => {
    const now = new Date();
    const nextRun = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      3, 30, 0, 0  // 09:00 IST = 03:30 UTC
    ));
    if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    return nextRun - now;
  };

  const scheduleNext = () => {
    const delay = msUntilFirstRun();
    console.log(
      `[DueDateReminder] Next run scheduled in ${Math.round(delay / 60000)} minute(s) (09:00 IST).`
    );
    setTimeout(async () => {
      await sendDueDateReminders();
      // After the first aligned run, repeat every 24 hours
      setInterval(sendDueDateReminders, MS_IN_DAY);
    }, delay);
  };

  scheduleNext();
};

module.exports = { sendDueDateReminders, scheduleDueDateReminders };
