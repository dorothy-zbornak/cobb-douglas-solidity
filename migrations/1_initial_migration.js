// const Migrations = artifacts.require("Migrations");
const CompareCobbDouglas = artifacts.require("CompareCobbDouglas");
const TestFixedMath = artifacts.require("TestFixedMath");

module.exports = async function(deployer) {
  // deployer.deploy(Migrations);
  await deployer.deploy(CompareCobbDouglas);
  await deployer.deploy(TestFixedMath);
};
