import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/datasource.js";

export class Board extends Model {
  declare boardId: number;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Board.init(
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
    timestamps: true,
  },
);
