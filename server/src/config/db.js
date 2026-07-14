const mongoose = require("mongoose");
const dns = require("node:dns");

// Some hosting environments resolve MongoDB Atlas SRV records unreliably
// via the default system resolver; pinning to public DNS avoids that.
const connectDB = async (mongoUri) => {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  await mongoose.connect(mongoUri);
};

module.exports = connectDB;
