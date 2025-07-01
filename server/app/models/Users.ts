import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.ts";

export class Users extends Model {
  declare userId: number;
  declare name: string;
  declare email: string;
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
  },
  {
    sequelize,
    modelName: "Users",
    timestamps: false,
  }
);