import { Sequelize } from "sequelize";

// https://sequelize.org/docs/v6/core-concepts/model-basics/#caveat-with-public-class-fields
export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "board.sqlite",
});