import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";
import { BoardPermission } from "#types/api.js";
import { Boards } from "./Boards.js";
import { Users } from "./Users.js";

export class BoardShares extends Model {
  declare shareId: number;
  declare boardId: number;
  declare userId: number;
  declare permission: BoardPermission;
}

BoardShares.init(
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
    modelName: "BoardShares",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["boardId", "userId"],
      },
    ],
  },
);

BoardShares.belongsTo(Boards, { foreignKey: "boardId" });
Boards.hasMany(BoardShares, { sourceKey: "boardId", foreignKey: "boardId" });

BoardShares.belongsTo(Users, { foreignKey: "userId" });
Users.hasMany(BoardShares, { sourceKey: "userId", foreignKey: "userId" });
