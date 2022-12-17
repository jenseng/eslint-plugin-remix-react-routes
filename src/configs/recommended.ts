import { SharedConfigurationSettings } from "@typescript-eslint/utils/dist/ts-eslint";

export const recommended = {
  plugins: ["remix-react-routes"],
  rules: {
    "remix-react-routes/use-link-for-routes": "error",
    "remix-react-routes/require-valid-paths": "error",
    "remix-react-routes/no-relative-paths": "error",
    "remix-react-routes/no-urls": "error",
  },
} as const;
