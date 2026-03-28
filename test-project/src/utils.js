const crypto = require("crypto");

function formatDate(params, callback) {
  const date = params && params.date ? new Date(params.date) : new Date();
  const locale = params && params.locale ? params.locale : "en-US";
  callback(null, date.toLocaleString(locale));
}

function validateEmail(params, callback) {
  const email = params && params.email ? String(params.email).trim() : "";
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  callback(null, isValid);
}

function paginate(params, callback) {
  const items = (params && params.items) || [];
  const page = Number((params && params.page) || 1);
  const limit = Number((params && params.limit) || 10);
  const offset = (page - 1) * limit;
  callback(null, {
    page,
    limit,
    total: items.length,
    data: items.slice(offset, offset + limit),
  });
}

function hashPassword(params, callback) {
  const value = params && params.value ? String(params.value) : "";
  const hash = crypto.createHash("sha256").update(value).digest("hex");
  callback(null, hash);
}

function generateId(params, callback) {
  const prefix = params && params.prefix ? params.prefix : "usr";
  const id = prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  callback(null, id);
}

module.exports = {
  formatDate,
  validateEmail,
  paginate,
  hashPassword,
  generateId,
};
