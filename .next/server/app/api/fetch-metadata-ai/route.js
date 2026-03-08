/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/fetch-metadata-ai/route";
exports.ids = ["app/api/fetch-metadata-ai/route"];
exports.modules = {

/***/ "cheerio":
/*!**************************!*\
  !*** external "cheerio" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("cheerio");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("buffer");

/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "fs/promises":
/*!******************************!*\
  !*** external "fs/promises" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("fs/promises");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "node:buffer":
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:http":
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ "node:https":
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ "node:net":
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:stream":
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ "node:stream/promises":
/*!***************************************!*\
  !*** external "node:stream/promises" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/promises");

/***/ }),

/***/ "node:stream/web":
/*!**********************************!*\
  !*** external "node:stream/web" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream/web");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ "node:zlib":
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "tls":
/*!**********************!*\
  !*** external "tls" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tls");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ "worker_threads":
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ }),

/***/ "?32c4":
/*!****************************!*\
  !*** bufferutil (ignored) ***!
  \****************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "?66e9":
/*!********************************!*\
  !*** utf-8-validate (ignored) ***!
  \********************************/
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ffetch-metadata-ai%2Froute&page=%2Fapi%2Ffetch-metadata-ai%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffetch-metadata-ai%2Froute.ts&appDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ffetch-metadata-ai%2Froute&page=%2Fapi%2Ffetch-metadata-ai%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffetch-metadata-ai%2Froute.ts&appDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_reach_gemini_antigravity_scratch_knowledge_indexer_src_app_api_fetch_metadata_ai_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./src/app/api/fetch-metadata-ai/route.ts */ \"(rsc)/./src/app/api/fetch-metadata-ai/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/fetch-metadata-ai/route\",\n        pathname: \"/api/fetch-metadata-ai\",\n        filename: \"route\",\n        bundlePath: \"app/api/fetch-metadata-ai/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\reach\\\\.gemini\\\\antigravity\\\\scratch\\\\knowledge-indexer\\\\src\\\\app\\\\api\\\\fetch-metadata-ai\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_reach_gemini_antigravity_scratch_knowledge_indexer_src_app_api_fetch_metadata_ai_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/fetch-metadata-ai/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZmZXRjaC1tZXRhZGF0YS1haSUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZmV0Y2gtbWV0YWRhdGEtYWklMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZmZXRjaC1tZXRhZGF0YS1haSUyRnJvdXRlLnRzJmFwcERpcj1DJTNBJTVDVXNlcnMlNUNyZWFjaCU1Qy5nZW1pbmklNUNhbnRpZ3Jhdml0eSU1Q3NjcmF0Y2glNUNrbm93bGVkZ2UtaW5kZXhlciU1Q3NyYyU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDcmVhY2glNUMuZ2VtaW5pJTVDYW50aWdyYXZpdHklNUNzY3JhdGNoJTVDa25vd2xlZGdlLWluZGV4ZXImaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDOEQ7QUFDM0k7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSx1R0FBdUc7QUFDL0c7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUM2Sjs7QUFFN0oiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9rbm93bGVkZ2UtaW5kZXhlci8/NTE2NyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCJDOlxcXFxVc2Vyc1xcXFxyZWFjaFxcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5XFxcXHNjcmF0Y2hcXFxca25vd2xlZGdlLWluZGV4ZXJcXFxcc3JjXFxcXGFwcFxcXFxhcGlcXFxcZmV0Y2gtbWV0YWRhdGEtYWlcXFxccm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2ZldGNoLW1ldGFkYXRhLWFpL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvZmV0Y2gtbWV0YWRhdGEtYWlcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2ZldGNoLW1ldGFkYXRhLWFpL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiQzpcXFxcVXNlcnNcXFxccmVhY2hcXFxcLmdlbWluaVxcXFxhbnRpZ3Jhdml0eVxcXFxzY3JhdGNoXFxcXGtub3dsZWRnZS1pbmRleGVyXFxcXHNyY1xcXFxhcHBcXFxcYXBpXFxcXGZldGNoLW1ldGFkYXRhLWFpXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2ZldGNoLW1ldGFkYXRhLWFpL3JvdXRlXCI7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHNlcnZlckhvb2tzLFxuICAgICAgICBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCwgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ffetch-metadata-ai%2Froute&page=%2Fapi%2Ffetch-metadata-ai%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffetch-metadata-ai%2Froute.ts&appDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/fetch-metadata-ai/route.ts":
/*!************************************************!*\
  !*** ./src/app/api/fetch-metadata-ai/route.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/exports/next-response */ \"(rsc)/./node_modules/next/dist/server/web/exports/next-response.js\");\n/* harmony import */ var cheerio__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! cheerio */ \"cheerio\");\n/* harmony import */ var cheerio__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(cheerio__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _google_genai__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @google/genai */ \"(rsc)/./node_modules/@google/genai/dist/node/index.mjs\");\n\n\n\nasync function POST(request) {\n    try {\n        const { url, doi } = await request.json();\n        if (!url && !doi) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                error: \"URL or DOI is required\"\n            }, {\n                status: 400\n            });\n        }\n        let rawContent = \"\";\n        let targetUrl = url;\n        if (doi) {\n            const cleanDoi = doi.trim();\n            targetUrl = `https://doi.org/${cleanDoi}`;\n            // Try fetching from CrossRef first for DOIs to get high-quality raw metadata\n            const crossRefRes = await fetch(`https://api.crossref.org/works/${cleanDoi}`).catch(()=>null);\n            if (crossRefRes && crossRefRes.ok) {\n                const data = await crossRefRes.json();\n                // We stringify the raw JSON so the LLM can easily parse the relevant fields\n                rawContent = JSON.stringify(data.message);\n            }\n        }\n        // If we don't have CrossRef data, or it's just a URL, fetch the HTML\n        if (!rawContent && targetUrl) {\n            const response = await fetch(targetUrl, {\n                headers: {\n                    \"User-Agent\": \"Mozilla/5.0 (Windows NT 10.0; Win64; x64)\"\n                }\n            }).catch(()=>null);\n            if (response && response.ok) {\n                const html = await response.text();\n                const $ = cheerio__WEBPACK_IMPORTED_MODULE_1__.load(html);\n                // Extract useful text for the LLM to avoid sending the entire raw HTML (which might exceed token limits)\n                const pageTitle = $(\"title\").text() || \"\";\n                const metaTags = $(\"meta\").map((i, el)=>{\n                    const name = $(el).attr(\"name\") || $(el).attr(\"property\");\n                    const content = $(el).attr(\"content\");\n                    return name && content ? `${name}: ${content}` : null;\n                }).get().filter(Boolean).join(\"\\n\");\n                // Get some text from paragraphs to help with abstract/summary\n                const pText = $(\"p\").map((i, el)=>$(el).text()).get().join(\"\\n\").substring(0, 4000);\n                rawContent = `TITLE: ${pageTitle}\\n\\nMETA TAGS:\\n${metaTags}\\n\\nCONTENT EXCERPT:\\n${pText}`;\n            }\n        }\n        if (!rawContent) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                error: \"Could not fetch content from the provided source\"\n            }, {\n                status: 400\n            });\n        }\n        // Now pass to Gemini\n        if (!process.env.GEMINI_API_KEY) {\n            return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n                error: \"Gemini API key not configured\"\n            }, {\n                status: 500\n            });\n        }\n        const ai = new _google_genai__WEBPACK_IMPORTED_MODULE_2__.GoogleGenAI({\n            apiKey: process.env.GEMINI_API_KEY\n        });\n        const systemPrompt = `You are a metadata extraction assistant. Your job is to extract structured metadata from the provided raw content (either HTML excerpts or JSON from CrossRef) for a knowledge indexer application.\r\n\r\nThe target URL/DOI is: ${targetUrl}\r\n\r\nExtract the following fields and return ONLY a JSON object:\r\n- title (string): The title of the article, video, paper, or post.\r\n- authors (array of strings): The authors, creators, or channel name. For videos, use the channel name. For social posts, use the author name or handle.\r\n- year (number or null): The year of publication or posting.\r\n- source (string): The journal, publisher, website name, or platform (e.g., \"YouTube\", \"X\", \"Twitter\", \"LinkedIn\", \"Nature\", \"New York Times\").\r\n- abstract (string): A short abstract or summary of the content.\r\n- contentType (string): Must be exactly one of: \"PAPER\", \"BLOG\", \"ESSAY\", \"ARTICLE\", \"POLICY_REPORT\", \"BOOK\", \"VIDEO\", \"SOCIAL_POST\", \"OTHER\". Choose VIDEO for YouTube/Vimeo, SOCIAL_POST for X/Twitter/LinkedIn/Threads, PAPER for academic DOIs, ARTICLE for news, etc.\r\n\r\nReturn exactly this JSON structure with no markdown formatting.`;\n        const completion = await ai.models.generateContent({\n            model: \"gemini-2.5-flash\",\n            contents: `${systemPrompt}\\n\\nContent to analyze:\\n${rawContent.substring(0, 15000)}`,\n            config: {\n                responseMimeType: \"application/json\",\n                temperature: 0.1\n            }\n        });\n        const resultText = completion.text || \"{}\";\n        let parsedData = {};\n        try {\n            parsedData = JSON.parse(resultText);\n        } catch (e) {\n            console.error(\"Failed to parse OpenAI response:\", resultText);\n        }\n        // Validate content type\n        const validTypes = [\n            \"PAPER\",\n            \"BLOG\",\n            \"ESSAY\",\n            \"ARTICLE\",\n            \"POLICY_REPORT\",\n            \"BOOK\",\n            \"VIDEO\",\n            \"SOCIAL_POST\",\n            \"OTHER\"\n        ];\n        let finalContentType = parsedData.contentType;\n        if (!validTypes.includes(finalContentType)) {\n            finalContentType = \"OTHER\";\n        }\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            title: parsedData.title || \"\",\n            authors: Array.isArray(parsedData.authors) ? parsedData.authors : [],\n            year: typeof parsedData.year === \"number\" ? parsedData.year : null,\n            source: parsedData.source || \"\",\n            abstract: parsedData.abstract || \"\",\n            contentType: finalContentType,\n            url: url || targetUrl,\n            doi: doi || \"\"\n        });\n    } catch (error) {\n        console.error(\"Error in AI fetch:\", error);\n        return next_dist_server_web_exports_next_response__WEBPACK_IMPORTED_MODULE_0__[\"default\"].json({\n            error: \"Internal server error during metadata extraction\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9mZXRjaC1tZXRhZGF0YS1haS9yb3V0ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUEyQztBQUNSO0FBQ1M7QUFFckMsZUFBZUcsS0FBS0MsT0FBZ0I7SUFDdkMsSUFBSTtRQUNBLE1BQU0sRUFBRUMsR0FBRyxFQUFFQyxHQUFHLEVBQUUsR0FBRyxNQUFNRixRQUFRRyxJQUFJO1FBRXZDLElBQUksQ0FBQ0YsT0FBTyxDQUFDQyxLQUFLO1lBQ2QsT0FBT04sa0ZBQVlBLENBQUNPLElBQUksQ0FBQztnQkFBRUMsT0FBTztZQUF5QixHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDaEY7UUFFQSxJQUFJQyxhQUFhO1FBQ2pCLElBQUlDLFlBQVlOO1FBRWhCLElBQUlDLEtBQUs7WUFDTCxNQUFNTSxXQUFXTixJQUFJTyxJQUFJO1lBQ3pCRixZQUFZLENBQUMsZ0JBQWdCLEVBQUVDLFNBQVMsQ0FBQztZQUV6Qyw2RUFBNkU7WUFDN0UsTUFBTUUsY0FBYyxNQUFNQyxNQUFNLENBQUMsK0JBQStCLEVBQUVILFNBQVMsQ0FBQyxFQUFFSSxLQUFLLENBQUMsSUFBTTtZQUMxRixJQUFJRixlQUFlQSxZQUFZRyxFQUFFLEVBQUU7Z0JBQy9CLE1BQU1DLE9BQU8sTUFBTUosWUFBWVAsSUFBSTtnQkFDbkMsNEVBQTRFO2dCQUM1RUcsYUFBYVMsS0FBS0MsU0FBUyxDQUFDRixLQUFLRyxPQUFPO1lBQzVDO1FBQ0o7UUFFQSxxRUFBcUU7UUFDckUsSUFBSSxDQUFDWCxjQUFjQyxXQUFXO1lBQzFCLE1BQU1XLFdBQVcsTUFBTVAsTUFBTUosV0FBVztnQkFDcENZLFNBQVM7b0JBQUUsY0FBYztnQkFBNEM7WUFDekUsR0FBR1AsS0FBSyxDQUFDLElBQU07WUFFZixJQUFJTSxZQUFZQSxTQUFTTCxFQUFFLEVBQUU7Z0JBQ3pCLE1BQU1PLE9BQU8sTUFBTUYsU0FBU0csSUFBSTtnQkFDaEMsTUFBTUMsSUFBSXpCLHlDQUFZLENBQUN1QjtnQkFFdkIseUdB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O1FBQ3BDLE9BQU9SLGtGQUFZQSxDQUFDTyxJQUFJLENBQUM7WUFBRUMsT0FBTztRQUFtRCxHQUFHO1lBQUVDLFFBQVE7UUFBSTtJQUMxRztBQUNKIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8va25vd2xlZGdlLWluZGV4ZXIvLi9zcmMvYXBwL2FwaS9mZXRjaC1tZXRhZGF0YS1haS9yb3V0ZS50cz82YmEyIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gJ25leHQvc2VydmVyJztcclxuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcclxuaW1wb3J0IHsgR29vZ2xlR2VuQUkgfSBmcm9tICdAZ29vZ2xlL2dlbmFpJztcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IFJlcXVlc3QpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgeyB1cmwsIGRvaSB9ID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XHJcblxyXG4gICAgICAgIGlmICghdXJsICYmICFkb2kpIHtcclxuICAgICAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdVUkwgb3IgRE9JIGlzIHJlcXVpcmVkJyB9LCB7IHN0YXR1czogNDAwIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHJhd0NvbnRlbnQgPSAnJztcclxuICAgICAgICBsZXQgdGFyZ2V0VXJsID0gdXJsO1xyXG5cclxuICAgICAgICBpZiAoZG9pKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuRG9pID0gZG9pLnRyaW0oKTtcclxuICAgICAgICAgICAgdGFyZ2V0VXJsID0gYGh0dHBzOi8vZG9pLm9yZy8ke2NsZWFuRG9pfWA7XHJcblxyXG4gICAgICAgICAgICAvLyBUcnkgZmV0Y2hpbmcgZnJvbSBDcm9zc1JlZiBmaXJzdCBmb3IgRE9JcyB0byBnZXQgaGlnaC1xdWFsaXR5IHJhdyBtZXRhZGF0YVxyXG4gICAgICAgICAgICBjb25zdCBjcm9zc1JlZlJlcyA9IGF3YWl0IGZldGNoKGBodHRwczovL2FwaS5jcm9zc3JlZi5vcmcvd29ya3MvJHtjbGVhbkRvaX1gKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgICAgaWYgKGNyb3NzUmVmUmVzICYmIGNyb3NzUmVmUmVzLm9rKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgY3Jvc3NSZWZSZXMuanNvbigpO1xyXG4gICAgICAgICAgICAgICAgLy8gV2Ugc3RyaW5naWZ5IHRoZSByYXcgSlNPTiBzbyB0aGUgTExNIGNhbiBlYXNpbHkgcGFyc2UgdGhlIHJlbGV2YW50IGZpZWxkc1xyXG4gICAgICAgICAgICAgICAgcmF3Q29udGVudCA9IEpTT04uc3RyaW5naWZ5KGRhdGEubWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElmIHdlIGRvbid0IGhhdmUgQ3Jvc3NSZWYgZGF0YSwgb3IgaXQncyBqdXN0IGEgVVJMLCBmZXRjaCB0aGUgSFRNTFxyXG4gICAgICAgIGlmICghcmF3Q29udGVudCAmJiB0YXJnZXRVcmwpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh0YXJnZXRVcmwsIHtcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHsgJ1VzZXItQWdlbnQnOiAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCknIH1cclxuICAgICAgICAgICAgfSkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWwpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgdXNlZnVsIHRleHQgZm9yIHRoZSBMTE0gdG8gYXZvaWQgc2VuZGluZyB0aGUgZW50aXJlIHJhdyBIVE1MICh3aGljaCBtaWdodCBleGNlZWQgdG9rZW4gbGltaXRzKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcGFnZVRpdGxlID0gJCgndGl0bGUnKS50ZXh0KCkgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtZXRhVGFncyA9ICQoJ21ldGEnKS5tYXAoKGksIGVsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICQoZWwpLmF0dHIoJ25hbWUnKSB8fCAkKGVsKS5hdHRyKCdwcm9wZXJ0eScpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSAkKGVsKS5hdHRyKCdjb250ZW50Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5hbWUgJiYgY29udGVudCA/IGAke25hbWV9OiAke2NvbnRlbnR9YCA6IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9KS5nZXQoKS5maWx0ZXIoQm9vbGVhbikuam9pbignXFxuJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gR2V0IHNvbWUgdGV4dCBmcm9tIHBhcmFncmFwaHMgdG8gaGVscCB3aXRoIGFic3RyYWN0L3N1bW1hcnlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBUZXh0ID0gJCgncCcpLm1hcCgoaSwgZWwpID0+ICQoZWwpLnRleHQoKSkuZ2V0KCkuam9pbignXFxuJykuc3Vic3RyaW5nKDAsIDQwMDApO1xyXG5cclxuICAgICAgICAgICAgICAgIHJhd0NvbnRlbnQgPSBgVElUTEU6ICR7cGFnZVRpdGxlfVxcblxcbk1FVEEgVEFHUzpcXG4ke21ldGFUYWdzfVxcblxcbkNPTlRFTlQgRVhDRVJQVDpcXG4ke3BUZXh0fWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmF3Q29udGVudCkge1xyXG4gICAgICAgICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ0NvdWxkIG5vdCBmZXRjaCBjb250ZW50IGZyb20gdGhlIHByb3ZpZGVkIHNvdXJjZScgfSwgeyBzdGF0dXM6IDQwMCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE5vdyBwYXNzIHRvIEdlbWluaVxyXG4gICAgICAgIGlmICghcHJvY2Vzcy5lbnYuR0VNSU5JX0FQSV9LRVkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdHZW1pbmkgQVBJIGtleSBub3QgY29uZmlndXJlZCcgfSwgeyBzdGF0dXM6IDUwMCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFpID0gbmV3IEdvb2dsZUdlbkFJKHtcclxuICAgICAgICAgICAgYXBpS2V5OiBwcm9jZXNzLmVudi5HRU1JTklfQVBJX0tFWSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgc3lzdGVtUHJvbXB0ID0gYFlvdSBhcmUgYSBtZXRhZGF0YSBleHRyYWN0aW9uIGFzc2lzdGFudC4gWW91ciBqb2IgaXMgdG8gZXh0cmFjdCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIGZyb20gdGhlIHByb3ZpZGVkIHJhdyBjb250ZW50IChlaXRoZXIgSFRNTCBleGNlcnB0cyBvciBKU09OIGZyb20gQ3Jvc3NSZWYpIGZvciBhIGtub3dsZWRnZSBpbmRleGVyIGFwcGxpY2F0aW9uLlxyXG5cclxuVGhlIHRhcmdldCBVUkwvRE9JIGlzOiAke3RhcmdldFVybH1cclxuXHJcbkV4dHJhY3QgdGhlIGZvbGxvd2luZyBmaWVsZHMgYW5kIHJldHVybiBPTkxZIGEgSlNPTiBvYmplY3Q6XHJcbi0gdGl0bGUgKHN0cmluZyk6IFRoZSB0aXRsZSBvZiB0aGUgYXJ0aWNsZSwgdmlkZW8sIHBhcGVyLCBvciBwb3N0LlxyXG4tIGF1dGhvcnMgKGFycmF5IG9mIHN0cmluZ3MpOiBUaGUgYXV0aG9ycywgY3JlYXRvcnMsIG9yIGNoYW5uZWwgbmFtZS4gRm9yIHZpZGVvcywgdXNlIHRoZSBjaGFubmVsIG5hbWUuIEZvciBzb2NpYWwgcG9zdHMsIHVzZSB0aGUgYXV0aG9yIG5hbWUgb3IgaGFuZGxlLlxyXG4tIHllYXIgKG51bWJlciBvciBudWxsKTogVGhlIHllYXIgb2YgcHVibGljYXRpb24gb3IgcG9zdGluZy5cclxuLSBzb3VyY2UgKHN0cmluZyk6IFRoZSBqb3VybmFsLCBwdWJsaXNoZXIsIHdlYnNpdGUgbmFtZSwgb3IgcGxhdGZvcm0gKGUuZy4sIFwiWW91VHViZVwiLCBcIlhcIiwgXCJUd2l0dGVyXCIsIFwiTGlua2VkSW5cIiwgXCJOYXR1cmVcIiwgXCJOZXcgWW9yayBUaW1lc1wiKS5cclxuLSBhYnN0cmFjdCAoc3RyaW5nKTogQSBzaG9ydCBhYnN0cmFjdCBvciBzdW1tYXJ5IG9mIHRoZSBjb250ZW50LlxyXG4tIGNvbnRlbnRUeXBlIChzdHJpbmcpOiBNdXN0IGJlIGV4YWN0bHkgb25lIG9mOiBcIlBBUEVSXCIsIFwiQkxPR1wiLCBcIkVTU0FZXCIsIFwiQVJUSUNMRVwiLCBcIlBPTElDWV9SRVBPUlRcIiwgXCJCT09LXCIsIFwiVklERU9cIiwgXCJTT0NJQUxfUE9TVFwiLCBcIk9USEVSXCIuIENob29zZSBWSURFTyBmb3IgWW91VHViZS9WaW1lbywgU09DSUFMX1BPU1QgZm9yIFgvVHdpdHRlci9MaW5rZWRJbi9UaHJlYWRzLCBQQVBFUiBmb3IgYWNhZGVtaWMgRE9JcywgQVJUSUNMRSBmb3IgbmV3cywgZXRjLlxyXG5cclxuUmV0dXJuIGV4YWN0bHkgdGhpcyBKU09OIHN0cnVjdHVyZSB3aXRoIG5vIG1hcmtkb3duIGZvcm1hdHRpbmcuYDtcclxuXHJcbiAgICAgICAgY29uc3QgY29tcGxldGlvbiA9IGF3YWl0IGFpLm1vZGVscy5nZW5lcmF0ZUNvbnRlbnQoe1xyXG4gICAgICAgICAgICBtb2RlbDogJ2dlbWluaS0yLjUtZmxhc2gnLFxyXG4gICAgICAgICAgICBjb250ZW50czogYCR7c3lzdGVtUHJvbXB0fVxcblxcbkNvbnRlbnQgdG8gYW5hbHl6ZTpcXG4ke3Jhd0NvbnRlbnQuc3Vic3RyaW5nKDAsIDE1MDAwKX1gLFxyXG4gICAgICAgICAgICBjb25maWc6IHtcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlTWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjEsXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgcmVzdWx0VGV4dCA9IGNvbXBsZXRpb24udGV4dCB8fCAne30nO1xyXG4gICAgICAgIGxldCBwYXJzZWREYXRhOiBhbnkgPSB7fTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShyZXN1bHRUZXh0KTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBPcGVuQUkgcmVzcG9uc2U6JywgcmVzdWx0VGV4dCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWYWxpZGF0ZSBjb250ZW50IHR5cGVcclxuICAgICAgICBjb25zdCB2YWxpZFR5cGVzID0gWydQQVBFUicsICdCTE9HJywgJ0VTU0FZJywgJ0FSVElDTEUnLCAnUE9MSUNZX1JFUE9SVCcsICdCT09LJywgJ1ZJREVPJywgJ1NPQ0lBTF9QT1NUJywgJ09USEVSJ107XHJcbiAgICAgICAgbGV0IGZpbmFsQ29udGVudFR5cGUgPSBwYXJzZWREYXRhLmNvbnRlbnRUeXBlO1xyXG4gICAgICAgIGlmICghdmFsaWRUeXBlcy5pbmNsdWRlcyhmaW5hbENvbnRlbnRUeXBlKSkge1xyXG4gICAgICAgICAgICBmaW5hbENvbnRlbnRUeXBlID0gJ09USEVSJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7XHJcbiAgICAgICAgICAgIHRpdGxlOiBwYXJzZWREYXRhLnRpdGxlIHx8ICcnLFxyXG4gICAgICAgICAgICBhdXRob3JzOiBBcnJheS5pc0FycmF5KHBhcnNlZERhdGEuYXV0aG9ycykgPyBwYXJzZWREYXRhLmF1dGhvcnMgOiBbXSxcclxuICAgICAgICAgICAgeWVhcjogdHlwZW9mIHBhcnNlZERhdGEueWVhciA9PT0gJ251bWJlcicgPyBwYXJzZWREYXRhLnllYXIgOiBudWxsLFxyXG4gICAgICAgICAgICBzb3VyY2U6IHBhcnNlZERhdGEuc291cmNlIHx8ICcnLFxyXG4gICAgICAgICAgICBhYnN0cmFjdDogcGFyc2VkRGF0YS5hYnN0cmFjdCB8fCAnJyxcclxuICAgICAgICAgICAgY29udGVudFR5cGU6IGZpbmFsQ29udGVudFR5cGUsXHJcbiAgICAgICAgICAgIHVybDogdXJsIHx8IHRhcmdldFVybCwgLy8gUHJvdmlkZSB0aGUgdXJsIGJhY2sgaWYgdGhleSB1c2VkIERPSVxyXG4gICAgICAgICAgICBkb2k6IGRvaSB8fCAnJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIEFJIGZldGNoOicsIGVycm9yKTtcclxuICAgICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgbWV0YWRhdGEgZXh0cmFjdGlvbicgfSwgeyBzdGF0dXM6IDUwMCB9KTtcclxuICAgIH1cclxufVxyXG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiY2hlZXJpbyIsIkdvb2dsZUdlbkFJIiwiUE9TVCIsInJlcXVlc3QiLCJ1cmwiLCJkb2kiLCJqc29uIiwiZXJyb3IiLCJzdGF0dXMiLCJyYXdDb250ZW50IiwidGFyZ2V0VXJsIiwiY2xlYW5Eb2kiLCJ0cmltIiwiY3Jvc3NSZWZSZXMiLCJmZXRjaCIsImNhdGNoIiwib2siLCJkYXRhIiwiSlNPTiIsInN0cmluZ2lmeSIsIm1lc3NhZ2UiLCJyZXNwb25zZSIsImhlYWRlcnMiLCJodG1sIiwidGV4dCIsIiQiLCJsb2FkIiwicGFnZVRpdGxlIiwibWV0YVRhZ3MiLCJtYXAiLCJpIiwiZWwiLCJuYW1lIiwiYXR0ciIsImNvbnRlbnQiLCJnZXQiLCJmaWx0ZXIiLCJCb29sZWFuIiwiam9pbiIsInBUZXh0Iiwic3Vic3RyaW5nIiwicHJvY2VzcyIsImVudiIsIkdFTUlOSV9BUElfS0VZIiwiYWkiLCJhcGlLZXkiLCJzeXN0ZW1Qcm9tcHQiLCJjb21wbGV0aW9uIiwibW9kZWxzIiwiZ2VuZXJhdGVDb250ZW50IiwibW9kZWwiLCJjb250ZW50cyIsImNvbmZpZyIsInJlc3BvbnNlTWltZVR5cGUiLCJ0ZW1wZXJhdHVyZSIsInJlc3VsdFRleHQiLCJwYXJzZWREYXRhIiwicGFyc2UiLCJlIiwiY29uc29sZSIsInZhbGlkVHlwZXMiLCJmaW5hbENvbnRlbnRUeXBlIiwiY29udGVudFR5cGUiLCJpbmNsdWRlcyIsInRpdGxlIiwiYXV0aG9ycyIsIkFycmF5IiwiaXNBcnJheSIsInllYXIiLCJzb3VyY2UiLCJhYnN0cmFjdCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/fetch-metadata-ai/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/gaxios","vendor-chunks/google-auth-library","vendor-chunks/ws","vendor-chunks/jws","vendor-chunks/retry","vendor-chunks/json-bigint","vendor-chunks/google-logging-utils","vendor-chunks/gcp-metadata","vendor-chunks/ecdsa-sig-formatter","vendor-chunks/@google","vendor-chunks/safe-buffer","vendor-chunks/p-retry","vendor-chunks/jwa","vendor-chunks/extend","vendor-chunks/buffer-equal-constant-time","vendor-chunks/bignumber.js","vendor-chunks/base64-js"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Ffetch-metadata-ai%2Froute&page=%2Fapi%2Ffetch-metadata-ai%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffetch-metadata-ai%2Froute.ts&appDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer%5Csrc%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5Creach%5C.gemini%5Cantigravity%5Cscratch%5Cknowledge-indexer&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();