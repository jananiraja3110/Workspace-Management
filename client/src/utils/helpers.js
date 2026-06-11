export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const getInitials = (name) => {
  if (!name) return '';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const calculateDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const getGreeting = () => {
  const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
  if (istHour < 12) return 'Good Morning';
  if (istHour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const truncate = (str, len = 50) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};
