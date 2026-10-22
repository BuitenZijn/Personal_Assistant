/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as functions_admin from "../functions/admin.js";
import type * as functions_appVersions from "../functions/appVersions.js";
import type * as functions_households from "../functions/households.js";
import type * as functions_receipts from "../functions/receipts.js";
import type * as functions_recipes from "../functions/recipes.js";
import type * as functions_users from "../functions/users.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_households from "../lib/households.js";
import type * as lib_passwordResetLinks from "../lib/passwordResetLinks.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_productStats from "../lib/productStats.js";
import type * as lib_random from "../lib/random.js";
import type * as lib_recipeClaude from "../lib/recipeClaude.js";
import type * as lib_recipeFetch from "../lib/recipeFetch.js";
import type * as lib_recipeParse from "../lib/recipeParse.js";
import type * as lib_storageClaims from "../lib/storageClaims.js";
import type * as lib_types from "../lib/types.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  auth: typeof auth;
  crons: typeof crons;
  "functions/admin": typeof functions_admin;
  "functions/appVersions": typeof functions_appVersions;
  "functions/households": typeof functions_households;
  "functions/receipts": typeof functions_receipts;
  "functions/recipes": typeof functions_recipes;
  "functions/users": typeof functions_users;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/households": typeof lib_households;
  "lib/passwordResetLinks": typeof lib_passwordResetLinks;
  "lib/permissions": typeof lib_permissions;
  "lib/productStats": typeof lib_productStats;
  "lib/random": typeof lib_random;
  "lib/recipeClaude": typeof lib_recipeClaude;
  "lib/recipeFetch": typeof lib_recipeFetch;
  "lib/recipeParse": typeof lib_recipeParse;
  "lib/storageClaims": typeof lib_storageClaims;
  "lib/types": typeof lib_types;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
