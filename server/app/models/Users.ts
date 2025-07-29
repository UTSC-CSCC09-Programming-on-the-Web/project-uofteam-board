import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/datasource.js";

export class Users extends Model {
  declare userId: number;
  declare name: string;
  declare email: string;
  declare pictureUrl: string;
}

Users.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    pictureUrl: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: "Users",
    timestamps: false,
  },
);
