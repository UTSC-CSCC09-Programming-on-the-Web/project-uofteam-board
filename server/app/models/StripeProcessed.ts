import { Model, DataTypes } from "sequelize";
import { sequelize } from "#config/datasource.js";

export class StripeProcessed extends Model {
  declare eventId: string;
  declare type: string;
  declare objectId: string;
  declare createdDate: Date;
}

StripeProcessed.init(
  {
    eventId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    objectId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "StripeProcessed",
    timestamps: false,
  },
);