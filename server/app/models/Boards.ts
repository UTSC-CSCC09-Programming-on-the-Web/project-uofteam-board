import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.ts";

export class Boards extends Model {
  declare boardId: number;
  declare name: string;
  declare ownerId: number;
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
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "userId",
      },
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
