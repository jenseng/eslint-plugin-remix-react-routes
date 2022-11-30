const remixDevPackage = require("@remix-run/dev/package.json");
const semver = require("semver");

const specifierBase = semver.lt(remixDevPackage.version, "1.6.2")
  ? "@remix-run/dev"
  : "@remix-run/dev/dist";

const { readConfig } = require(`${specifierBase}/config`);
const { formatRoutesAsJson } = require(`${specifierBase}/config/format`);

module.exports = { readConfig, formatRoutesAsJson };
