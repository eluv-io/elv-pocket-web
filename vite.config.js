import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import react from "@vitejs/plugin-react-swc";
import mkcert from "vite-plugin-mkcert";

export default defineConfig(() => {
  let plugins = [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "configuration.js",
          dest: ""
        },
        {
          src: "src/assets/icons/favicon.png",
          dest: ""
        },
      ]
    }),
    mkcert()
  ];

  return {
    devServer: {

    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    },
    plugins,
    server: {
      port: 8091,
      host: true
    },
    resolve: {
      // Synchronize with jsonconfig.json
      alias: {
        "@/assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
        "@/components": fileURLToPath(new URL("./src/components", import.meta.url)),
        "@/stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
        "@/utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
        dashjs: "dashjs/dist/dash.all.min.js"
      }
    },
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          assetFileNames: assetInfo => {
            const ext = assetInfo.names[0].split(".").slice(-1)[0];
            if(ext === "css") {
              return "index.css";
            } else {
              return assetInfo.originalFileName;
            }
          }
        }
      }
    }
  };
});
