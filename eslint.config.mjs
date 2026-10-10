import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["node_modules/", "gen/", "dist/", "report/", "coverage/", "**/resources/"]
    },
    js.configs.recommended,

    // ── Geliştirici betikleri (ES modülü) ──────────────────
    {
        files: ["scripts/**/*.mjs"],
        languageOptions: {
            sourceType: "module",
            globals: { ...globals.node, ...globals.browser }
        }
    },

    // ── Backend (CAP, Node.js) ─────────────────────────────
    {
        files: ["srv/**/*.js", "test/**/*.js", "*.js"],
        languageOptions: {
            sourceType: "commonjs",
            globals: {
                ...globals.node,
                // CAP'in global sorgu yardımcıları
                SELECT: "readonly",
                INSERT: "readonly",
                UPSERT: "readonly",
                UPDATE: "readonly",
                DELETE: "readonly",
                CREATE: "readonly",
                DROP: "readonly"
            }
        }
    },

    // ── UI5 uygulamaları (tarayıcı) ────────────────────────
    {
        files: ["app/**/webapp/**/*.js"],
        languageOptions: {
            sourceType: "script",
            globals: {
                ...globals.browser,
                sap: "readonly",
                QUnit: "readonly"
            }
        },
        rules: {
            "no-unused-vars": ["error", { args: "none" }]
        }
    }
];
