import { Sequelize } from "sequelize";

// https://sequelize.org/docs/v6/core-concepts/model-basics/#caveat-with-public-class-fields
export const sequelize = new Sequelize(
  process.env.DB_NAME || "teamboard", // database
  process.env.DB_USER || "board", // username
  process.env.DB_PASS || "1234", // password
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    dialect: "postgres",
    dialectOptions: {
      ssl: false,
    },
    logging: (msg: string) => {
      console.log(msg);
    },
  },
);
