import { SharedConfigurationSettings } from "@typescript-eslint/utils/dist/ts-eslint";

export const strict = {
  plugins: ["remix-react-routes"],
  rules: {
    "remix-react-routes/use-link-for-routes": "error",
    "remix-react-routes/require-valid-paths": "error",
    "remix-react-routes/no-relative-paths": [
      "error",
      { enforceInRouteComponents: true },
    ],
    "remix-react-routes/no-urls": "error",
  },
  settings: {
    remixReactRoutes: {
      strictMode: true,
    },
  } as SharedConfigurationSettings,
} as const;
