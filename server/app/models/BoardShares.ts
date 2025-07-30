import { Model, DataTypes } from "sequelize";
import { sequelize } from "../config/datasource.js";
import { BoardPermission } from "#types/api.js";
import { Board } from "./Boards.js";
import { User } from "./Users.js";

export class BoardShare extends Model {
  declare shareId: number;
  declare boardId: number;
  declare userId: number;
  declare permission: BoardPermission;
}

BoardShare.init(
  {
    shareId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Boards",
        key: "boardId",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "userId",
      },
    },
    permission: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["boardId", "userId"],
      },
    ],
  },
);

BoardShare.belongsTo(Board, { foreignKey: "boardId", onDelete: "CASCADE", hooks: true });
Board.hasMany(BoardShare, { sourceKey: "boardId", foreignKey: "boardId" });

BoardShare.belongsTo(User, { foreignKey: "userId" });
User.hasMany(BoardShare, { sourceKey: "userId", foreignKey: "userId" });
