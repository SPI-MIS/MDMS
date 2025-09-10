// check-case.js
import fs from "fs";
import path from "path";

function checkImports(dir) {
  let errors = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.(js|ts|vue)$/i.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");

        // 找出 import 語句
        const regex = /from\s+['"](.+)['"]|require\(['"](.+)['"]\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const importPath = match[1] || match[2];
          if (
            importPath &&
            (importPath.startsWith(".") || importPath.startsWith("./") || importPath.startsWith("../"))
          ) {
            const absImportPath = path.resolve(path.dirname(fullPath), importPath);

            // 檢查副檔名（可能沒寫，要補上 js/ts/vue）
            const candidates = [absImportPath, absImportPath + ".js", absImportPath + ".ts", absImportPath + ".vue"];
            const found = candidates.find((c) => fs.existsSync(c));
            if (found) {
              // 真實檔名
              const realName = path.basename(found);
              // 匯入時寫的檔名
              const importName = path.basename(importPath);
              if (realName !== importName) {
                errors.push(
                  `❌ 大小寫不符: ${fullPath} 匯入 ${importPath}，實際檔名是 ${realName}`
                );
              }
            }
          }
        }
      }
    }
  }

  walk(dir);

  return errors;
}

const errors = checkImports(path.resolve("./backend"));
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1); // 失敗
} else {
  console.log("✅ 所有 import 大小寫正確");
}
