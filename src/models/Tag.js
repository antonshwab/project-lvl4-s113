import Sequelize from 'sequelize';

export default connect => connect.define('Tag', {
  name: {
    type: Sequelize.STRING,
    unique: true,
    validate: {
      notEmpty: true,
      // allowNull: false,
    },
  },
}, {
  freezeTableName: true,
  timestamps: false,
});
