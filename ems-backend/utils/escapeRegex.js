// Escape user input before using it inside a RegExp / $regex
export const escapeRegex = (str = "") => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export default escapeRegex;
