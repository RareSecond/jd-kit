/**
 * ESLint rule to enforce component co-location with routes.
 *
 * Components should be co-located in the same directory as the route that uses them.
 * Exception: Components used by multiple routes can live in the top-level components folder.
 *
 * This rule recursively scans all route files and their component dependencies to build
 * a complete usage map, then reports violations for single-use components not co-located
 * with their route.
 */

import fs from "fs";
import path from "path";

// Cache for component usage across ESLint runs
// Key: srcDir, Value: { componentUsageMap: Map, timestamp: number }
const cache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds cache

/**
 * Check if a file is a route file (starts with ~)
 */
function isRouteFile(filePath) {
  const basename = path.basename(filePath);
  return basename.startsWith("~") && basename.endsWith(".tsx");
}

/**
 * Check if a component is co-located with a route file
 */
function isColocatedWith(componentPath, routePath) {
  const routeDir = path.dirname(routePath);
  const componentDir = path.dirname(componentPath);

  if (routeDir === componentDir) {
    return true;
  }

  const relativePath = path.relative(routeDir, componentDir);
  return (
    relativePath &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

/**
 * Get all route files in the src directory
 */
function getAllRouteFiles(srcDir) {
  const routeFiles = [];
  const routesDir = path.join(srcDir, "routes");

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && isRouteFile(fullPath)) {
        routeFiles.push(fullPath);
      }
    }
  }

  scanDir(routesDir);
  return routeFiles;
}

/**
 * Resolve an import path to an absolute file path
 */
function resolveImportPath(importPath, currentFilePath, srcDir) {
  if (importPath.startsWith("@/")) {
    const aliasPath = importPath.replace("@/", "");
    const possiblePaths = [
      path.join(srcDir, aliasPath + ".tsx"),
      path.join(srcDir, aliasPath + ".ts"),
      path.join(srcDir, aliasPath, "index.tsx"),
      path.join(srcDir, aliasPath, "index.ts"),
    ];
    return possiblePaths.find((p) => fs.existsSync(p)) || null;
  }

  if (importPath.startsWith(".")) {
    const currentDir = path.dirname(currentFilePath);
    const possiblePaths = [
      path.join(currentDir, importPath + ".tsx"),
      path.join(currentDir, importPath + ".ts"),
      path.join(currentDir, importPath, "index.tsx"),
      path.join(currentDir, importPath, "index.ts"),
    ];
    return possiblePaths.find((p) => fs.existsSync(p)) || null;
  }

  return null;
}

/**
 * Extract import paths from a file using simple regex
 * (faster than full AST parsing for this purpose)
 */
function extractImports(filePath, srcDir) {
  const content = fs.readFileSync(filePath, "utf-8");
  const imports = [];

  // Match import statements: import { X } from "path" or import X from "path"
  const importRegex =
    /import\s+(?:{[^}]+}|[^{}\s]+(?:\s*,\s*{[^}]+})?)\s+from\s+["']([^"']+)["']/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolvedPath = resolveImportPath(importPath, filePath, srcDir);
    if (resolvedPath) {
      imports.push(resolvedPath);
    }
  }

  return imports;
}

/**
 * Recursively collect all component imports from a file and its dependencies.
 * Returns a Set of all component file paths used (directly or transitively).
 */
function collectComponentImportsRecursively(
  filePath,
  srcDir,
  componentsFolder,
  visited = new Set()
) {
  // Avoid infinite loops from circular imports
  if (visited.has(filePath)) {
    return new Set();
  }
  visited.add(filePath);

  const componentImports = new Set();

  try {
    const imports = extractImports(filePath, srcDir);

    for (const importPath of imports) {
      // Track imports from the components folder
      if (importPath.startsWith(componentsFolder)) {
        componentImports.add(importPath);

        // Recursively scan this component for its own component imports
        const nestedImports = collectComponentImportsRecursively(
          importPath,
          srcDir,
          componentsFolder,
          visited
        );
        for (const nested of nestedImports) {
          componentImports.add(nested);
        }
      }
    }
  } catch {
    // Ignore errors reading individual files
  }

  return componentImports;
}

/**
 * Build or retrieve cached component usage map.
 * Maps each component to the set of routes that use it (directly or transitively).
 */
function getComponentUsageMap(srcDir, componentsFolderName) {
  const cacheKey = srcDir;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.componentUsageMap;
  }

  const componentsFolder = path.join(srcDir, componentsFolderName);
  const componentUsageMap = new Map(); // component path -> Set of route files
  const routeFiles = getAllRouteFiles(srcDir);

  for (const routeFile of routeFiles) {
    // Get all components used by this route (including nested/transitive)
    const allComponents = collectComponentImportsRecursively(
      routeFile,
      srcDir,
      componentsFolder,
      new Set()
    );

    for (const componentPath of allComponents) {
      if (!componentUsageMap.has(componentPath)) {
        componentUsageMap.set(componentPath, new Set());
      }
      componentUsageMap.get(componentPath).add(routeFile);
    }
  }

  cache.set(cacheKey, { componentUsageMap, timestamp: now });
  return componentUsageMap;
}

/**
 * Check if a specifier imports a component (PascalCase named export)
 */
function isComponentImport(specifier) {
  const name = specifier.imported?.name || specifier.local?.name;
  if (!name) return false;
  return /^[A-Z]/.test(name);
}

/**
 * Find the src directory from a file path
 */
function findSrcDir(filename) {
  let srcDir = path.dirname(filename);
  while (srcDir && !fs.existsSync(path.join(srcDir, "routes"))) {
    const parent = path.dirname(srcDir);
    if (parent === srcDir) {
      return null;
    }
    srcDir = parent;
  }

  if (path.basename(srcDir) === "routes") {
    srcDir = path.dirname(srcDir);
  }

  return srcDir;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce component co-location with routes. Single-use components should be co-located with their route.",
      category: "Best Practices",
      recommended: false,
    },
    fixable: null,
    schema: [
      {
        type: "object",
        properties: {
          componentsFolder: {
            type: "string",
            description:
              "Path to the shared components folder (relative to src)",
            default: "components",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      shouldBeColocated:
        "Component '{{componentName}}' is only used by route '{{routeName}}' (directly or transitively). Consider moving it to '{{suggestedPath}}' for better co-location.",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const options = context.options[0] || {};
    const componentsFolderName = options.componentsFolder || "components";

    const srcDir = findSrcDir(filename);
    if (!srcDir) {
      return {};
    }

    const componentsFolder = path.join(srcDir, componentsFolderName);

    // Only lint files inside the components folder
    if (!filename.startsWith(componentsFolder)) {
      return {};
    }

    const componentUsageMap = getComponentUsageMap(srcDir, componentsFolderName);

    // Check this component file against the usage map
    const usedByRoutes = componentUsageMap.get(filename);

    // If used by exactly one route and not co-located, report
    if (usedByRoutes && usedByRoutes.size === 1) {
      const routeFile = [...usedByRoutes][0];

      if (!isColocatedWith(filename, routeFile)) {
        const componentName = path.basename(filename, path.extname(filename));
        const routeDir = path.dirname(routeFile);
        const routeName = path.relative(srcDir, routeFile);
        const suggestedPath = path.relative(
          srcDir,
          path.join(routeDir, path.basename(filename))
        );

        return {
          Program(node) {
            context.report({
              node,
              messageId: "shouldBeColocated",
              data: {
                componentName,
                routeName,
                suggestedPath,
              },
            });
          },
        };
      }
    }

    return {};
  },
};

// Export a function to reset the cache (useful for testing)
export function resetCache() {
  cache.clear();
}
