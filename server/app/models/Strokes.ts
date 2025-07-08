import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.ts";

export class Strokes extends Model {
  declare strokeId: string;
  declare d: string;
  declare color: string;
  declare width: number;
  declare fillColor: string;
}

Strokes.init(
  {
    strokeId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUID,
    },
    d: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fillColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Boards",
        key: "boardId",
      },
    }
  },
  {
    sequelize,
    modelName: "Strokes",
    timestamps: false,
  },
);
