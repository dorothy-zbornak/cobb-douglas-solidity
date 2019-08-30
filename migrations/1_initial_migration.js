// const Migrations = artifacts.require("Migrations");
const CompareCobbDouglas = artifacts.require("CompareCobbDouglas");

module.exports = function(deployer) {
  // deployer.deploy(Migrations);
  return deployer.deploy(CompareCobbDouglas);
};
