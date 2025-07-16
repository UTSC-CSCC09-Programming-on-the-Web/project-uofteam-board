import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";

export class Boards extends Model {
  declare boardId: number;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Boards.init(
  {
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Boards",
    timestamps: true,
  },
);
