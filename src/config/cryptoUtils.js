import CryptoJS from "crypto-js";

// Secret key (store in .env ideally)
const SECRET_KEY = "WINWAY_SUPER_PRIVATE_KEY_2025";

export const encryptData = (text) => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptData = (cipher) => {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};
