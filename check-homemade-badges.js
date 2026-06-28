// Validates homemade.json and that every badge has its matching image files in
// assets/badges. Run in CI on pull requests (see
// .github/workflows/check-homemade-badges.yml). Dependency-free so it needs no
// install step.

const fs = require("fs");
const path = require("path");

const KEY_REGEX = /^[a-z0-9-_]+$/;
const DISPLAY_NAME_MAX_LENGTH = 50;
const DISCORD_ID_REGEX = /^\d{17,19}$/;
const BADGES_LOCATION = path.join(__dirname, "assets", "badges");
const REQUIRED_EXTENSIONS = ["avif", "gif"];

function fail(message) {
  console.error(message);
  process.exit(1);
}

const badges = JSON.parse(
  fs.readFileSync(path.join(__dirname, "homemade.json"), "utf8"),
);

if (typeof badges !== "object" || badges === null || Array.isArray(badges)) {
  fail("Invalid homemade.json format: expected an object");
}

// validate shape of each entry
for (const [key, badge] of Object.entries(badges)) {
  if (!KEY_REGEX.test(key)) {
    fail(`Invalid key "${key}": only a-z, 0-9, - and _ are allowed`);
  }
  if (
    typeof badge !== "object" ||
    badge === null ||
    typeof badge.displayName !== "string" ||
    typeof badge.authorDiscordId !== "string"
  ) {
    fail(
      `Invalid entry for "${key}": expected { displayName: string, authorDiscordId: string }`,
    );
  }
  if (
    badge.displayName.length < 1 ||
    badge.displayName.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    fail(
      `Invalid displayName for "${key}": must be between 1 and ${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }
  if (!DISCORD_ID_REGEX.test(badge.authorDiscordId)) {
    fail(`Invalid authorDiscordId for "${key}": must be 17-19 digits`);
  }
}

// check keys in alphabetical order
let lastKey = "";
for (const key of Object.keys(badges)) {
  if (key.localeCompare(lastKey) < 0) {
    fail(`Invalid key order in homemade.json: ${lastKey} > ${key}`);
  }
  lastKey = key;
}

// check for duplicate displayName values and encoding issues
const displayNames = new Map();
for (const [key, badge] of Object.entries(badges)) {
  const existingKey = displayNames.get(badge.displayName);
  if (existingKey) {
    fail(
      `Duplicate displayName "${badge.displayName}" found in keys: ${existingKey} and ${key}`,
    );
  }
  displayNames.set(badge.displayName, key);

  // check for Unicode replacement characters (encoding issues)
  if (badge.displayName.includes("�")) {
    fail(
      `Invalid encoding in displayName for badge "${key}": contains replacement character (�). This usually means the file was saved with incorrect encoding.`,
    );
  }
}

// check each key has the matching files in the right location
for (const fileName of Object.keys(badges)) {
  for (const ext of REQUIRED_EXTENSIONS) {
    const filePath = path.join(BADGES_LOCATION, `${fileName}.${ext}`);
    if (!fs.existsSync(filePath)) {
      fail(`Missing file for badge ${fileName}: ${filePath} does not exist`);
    }
  }
}

console.info("Homemade badges check passed");
