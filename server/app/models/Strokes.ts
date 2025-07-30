import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/datasource.js";
import { Board } from "./Boards.js";

export class Stroke extends Model {
  declare strokeId: string;
  declare boardId: number;

  declare d: string;
  declare color: string;
  declare width: number;
  declare fillColor: string;

  declare x: number;
  declare y: number;
  declare scaleX: number;
  declare scaleY: number;
  declare rotation: number;
}

Stroke.init(
  {
    strokeId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUID,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Boards",
        key: "boardId",
      },
    },
    d: {
      type: DataTypes.TEXT,
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
    x: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    y: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    scaleX: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    scaleY: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    rotation: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Strokes",
    timestamps: false,
  },
);

Stroke.belongsTo(Board, { foreignKey: "boardId", onDelete: "CASCADE", hooks: true });
Board.hasMany(Stroke, { sourceKey: "boardId", foreignKey: "boardId" });
