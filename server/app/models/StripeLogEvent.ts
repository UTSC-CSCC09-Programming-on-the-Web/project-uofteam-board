import { Model, DataTypes } from "sequelize";
import { sequelize } from "#config/datasource.js";

export class StripeLogEvent extends Model {
  declare eventId: string;
  declare type: string;
  declare objectId: string;
  declare createdDate: Date;
}

StripeLogEvent.init(
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
    timestamps: false,
  },
);