export const generateReferralCode = (name = "") => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = name ? name.slice(0, 3).toUpperCase() : "USR";
  return `${prefix}-${random}`;
};

export default { generateReferralCode };