import { Sequelize } from "sequelize";

// https://sequelize.org/docs/v6/core-concepts/model-basics/#caveat-with-public-class-fields
export const sequelize = new Sequelize(
  process.env.DB_NAME || "postgres", // database
  process.env.DB_USER || "postgres", // username
  process.env.DB_PASS || "postgres", // password
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    dialect: "postgres",
    logging: (msg: string) => {
      console.log(msg);
    },
  },
);
