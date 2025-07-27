import { Model, DataTypes } from "sequelize";
import { sequelize } from "../datasource.js";
import { Users } from "./Users.js";

export class StripeCustomers extends Model {
  declare userId: number;
  declare customerId: string;
  declare subscriptionId: string;
  declare checkoutId: string;
  declare status: string;
}

StripeCustomers.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: "Users",
        key: "userId"
      }
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    subscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      defaultValue: null,
    },
    checkoutId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: "StripeCustomers",
    timestamps: true,
  },
);

StripeCustomers.belongsTo(Users, { foreignKey: "userId" });
Users.hasMany(StripeCustomers, { sourceKey: "userId", foreignKey: "userId" });