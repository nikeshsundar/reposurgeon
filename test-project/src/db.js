const users = [
  { id: "usr_1", name: "Alice", email: "alice@example.com" },
  { id: "usr_2", name: "Bob", email: "bob@example.com" },
];

function getUsers(callback) {
  setTimeout(function () {
    callback(null, users.slice());
  }, 20);
}

function getUserById(params, callback) {
  setTimeout(function () {
    const id = params && params.id ? String(params.id) : "";
    const user = users.find(function (u) {
      return u.id === id;
    });
    callback(null, user || null);
  }, 20);
}

function createUser(params, callback) {
  setTimeout(function () {
    users.push(params.user);
    callback(null, params.user);
  }, 20);
}

function deleteUser(params, callback) {
  setTimeout(function () {
    const index = users.findIndex(function (u) {
      return u.id === params.id;
    });

    if (index === -1) {
      callback(null, false);
      return;
    }

    users.splice(index, 1);
    callback(null, true);
  }, 20);
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  deleteUser,
};
