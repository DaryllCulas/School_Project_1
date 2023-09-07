// Server Config
const config = {
  user: process.env.DB_USER,          // Use the environment variable for the user
  password: process.env.DB_PASSWORD,  // Use the environment variable for the password
  server: process.env.DB_SERVER,      // Use the environment variable for the server
  database: process.env.DB_DATABASE,  // Use the environment variable for the database
  port: parseInt(process.env.DB_PORT), // Parse the environment variable for the port as an integer
  options: {
    trustServerCertificate: true,
  },
};

module.exports = config;
