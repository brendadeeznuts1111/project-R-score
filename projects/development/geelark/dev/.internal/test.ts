// #!/usr/bin/env bun
// // Dev HQ test fixture - Console depth demonstration
//
// // Deep nested object for testing console depth
// const deepObject = {
//   insights: {
//     files: [
//       {
//         name: "deep.ts",
//         nested: {
//           level1: {
//             level2: {
//               level3: {
//                 level4: {
//                   level5: {
//                     level6: {
//                       level7: {
//                         level8: {
//                           level9: {
//                             level10: {
//                               value: "Found at depth 10!",
//                               timestamp: Date.now(),
//                             },
//                           },
//                         },
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     ],
//     stats: {
//       health: 85,
//       meta: {
//         timestamp: Date.now(),
//         env: process.env,
//         config: {
//           database: {
//             connection: {
//               pool: {
//                 max: 10,
//                 min: 2,
//               },
//             },
//           },
//         },
//       },
//     },
//   },
//   system: {
//     memory: process.memoryUsage(),
//     platform: process.platform,
//     versions: {
//       bun: typeof Bun !== "undefined" ? Bun.version : "N/A",
//       node: process.version,
//     },
//   },
// };
//
// // Array with deep nesting
// const deepArray = [
//   {
//     items: [
//       {
//         nested: {
//           deeply: {
//             hidden: {
//               secret: "Array nesting test",
//             },
//           },
//         },
//       },
//     ],
//   },
// ];
//
// // Circular reference test
// const circular: any = {
//   name: "root",
//   data: {
//     nested: "value",
//   },
// };
// circular.self = circular;
// circular.nested = {
//   deep: {
//     deeper: {
//       circular: circular,
//     },
//   },
// };
//
// console.log("📊 Deep Object Test:");
// console.log(deepObject);
//
// console.log("\n📋 Deep Array Test:");
// console.log(deepArray);
//
// console.log("\n🔁 Circular Reference Test:");
// console.log(circular);
//
// console.log("\n💡 Tip: Run with --console-depth=<number> to control output depth");
// console.log("   Example: bun --console-depth=5 .dev/test.ts");
