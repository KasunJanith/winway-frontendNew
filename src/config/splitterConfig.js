/**
 * splitterConfig.js
 * -----------------
 * Central store for splitter-related configuration that persists in localStorage.
 * Used by SplitterSettings, UploadPage, SplitPage, and related pages.
 */

const STORAGE_KEY = "splitter_config";

// ─── Default configuration ───────────────────────────────────────────────────

export const DEFAULT_CONFIG = {
  /** Agents available in the system */
  agents: [
    { id: "JAYAWAY", name: "JAYAWAY", active: true },
    { id: "WINWAY", name: "WINWAY", active: true },
  ],

  /** Lottery definitions */
  lotteries: [
    { code: "ada", prefix: "ada", displayName: "Ada Sampatha", active: true },
    { code: "dana", prefix: "dana", displayName: "Dhana Nidhanaya", active: true },
    { code: "govi", prefix: "govi", displayName: "Govi Setha", active: true },
    { code: "hada", prefix: "hada", displayName: "Handahana", active: true },
    { code: "maha", prefix: "maha", displayName: "Mahajana Sampatha", active: true },
    { code: "mgap", prefix: "mgap", displayName: "Mega Power", active: true },
    { code: "jaya", prefix: "jaya", displayName: "NLB Jaya", active: true },
    { code: "suba", prefix: "suba", displayName: "Suba Dawasak", active: true },
  ],

  /** Validation rules that can be toggled on/off */
  validations: {
    /** Upload page: zip must contain exactly N DBF files */
    requireExactFileCount: {
      enabled: true,
      label: "Require exact DBF file count",
      description:
        "When ON, the uploaded ZIP must contain exactly the expected number of DBF files (default 8). When OFF, partial uploads are allowed and additional files for the same date are merged into the existing session.",
      page: "Upload",
    },
    /** Upload page: each DBF filename must use a recognised lottery prefix */
    requireValidPrefix: {
      enabled: true,
      label: "Require valid lottery prefix in filenames",
      description:
        "Each DBF file inside the archive must start with a known lottery prefix (e.g. ada, jaya). The check is case-insensitive.",
      page: "Upload",
    },
    /** Upload page: DBF files must have the correct draw number */
    requireCorrectDrawNumber: {
      enabled: true,
      label: "Require correct draw number in filenames",
      description:
        "The draw number embedded in each DBF filename must match the expected draw number for the selected date. This validation cannot be disabled.",
      page: "Upload",
      locked: true, // cannot be toggled
    },
    /** Upload page: archive must be ZIP or RAR */
    requireArchiveExtension: {
      enabled: true,
      label: "Require ZIP or RAR archive",
      description:
        "Only .zip and .rar archives are accepted for upload.",
      page: "Upload",
    },
    /** Upload page: archive must be below 100 MB */
    requireFileSizeLimit: {
      enabled: true,
      label: "Enforce 100 MB file-size limit",
      description:
        "The uploaded archive must not exceed 100 MB.",
      page: "Upload",
    },
    /** Upload page: orders must exist for the selected date */
    requireOrdersExist: {
      enabled: true,
      label: "Require orders to exist before upload",
      description:
        "An archive can only be uploaded for a date that already has order entries.",
      page: "Upload",
    },
    /** Split page: upload must be validated before splitting */
    requireUploadValidation: {
      enabled: true,
      label: "Require upload validation before splitting",
      description:
        "The DBF archive must pass validation checks before the split action is allowed. When exact file count is OFF, partial archives that match their orders are considered valid.",
      page: "Split",
    },
    /** Assignment page: total assigned must equal ordered quantity */
    requireAssignmentBalance: {
      enabled: true,
      label: "Require balanced agent assignment",
      description:
        "The total tickets assigned to agents must equal the total ordered quantity for each lottery.",
      page: "Assignment",
    },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load the full config from localStorage, falling back to defaults.
 */
export const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    const saved = JSON.parse(raw);

    // Deep-merge saved validations with defaults so new rules added later
    // are automatically available with their default enabled state.
    const mergedValidations = { ...DEFAULT_CONFIG.validations };
    if (saved.validations) {
      Object.keys(mergedValidations).forEach((key) => {
        if (saved.validations[key] !== undefined) {
          mergedValidations[key] = {
            ...mergedValidations[key],
            ...saved.validations[key],
          };
        }
      });
    }

    // Preserve active flags on agents/lotteries from local storage
    const defaultAgents = DEFAULT_CONFIG.agents;
    const savedAgents = saved.agents || [];
    const agents = (savedAgents.length ? savedAgents : defaultAgents).map((a) => ({
      ...a,
      active: a.active !== false,
    }));

    const defaultLotteries = DEFAULT_CONFIG.lotteries;
    const savedLotteries = saved.lotteries || [];
    const lotteries = (savedLotteries.length ? savedLotteries : defaultLotteries).map((l) => ({
      ...l,
      active: l.active !== false,
    }));

    return {
      ...DEFAULT_CONFIG,
      ...saved,
      agents,
      lotteries,
      validations: mergedValidations,
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
};

/**
 * Persist the full config to localStorage.
 */
export const saveConfig = (config) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

/**
 * Convenience: read a single validation flag.
 * Returns `true` (enabled) when the key is unknown (fail-safe).
 */
export const isValidationEnabled = (key) => {
  const config = loadConfig();
  const rule = config.validations?.[key];
  if (!rule) return true;
  return rule.enabled !== false;
};

/**
 * Convenience: get the active agents list.
 */
export const getActiveAgents = () => {
  const config = loadConfig();
  return (config.agents || []).filter((a) => a.active);
};

/**
 * Convenience: get the active lotteries list.
 */
export const getActiveLotteries = () => {
  const config = loadConfig();
  return (config.lotteries || []).filter((l) => l.active);
};