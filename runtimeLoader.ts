import Phaser from "phaser";

export type AssetDescriptor =
  | { type: "image"; key: string; url: string }
  | {
      type: "spritesheet";
      key: string;
      url: string;
      frameConfig: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
    }
  | { type: "audio"; key: string; urls: string[] }
  | { type: "tilemapTiledJSON"; key: string; url: string }
  | { type: "bitmapFont"; key: string; textureURL: string; atlasURL: string }
  | { type: "json"; key: string; url: string };

function isLoaded(scene: Phaser.Scene, asset: AssetDescriptor): boolean {
  switch (asset.type) {
    case "image":
    case "spritesheet":
      return scene.textures.exists(asset.key);
    case "audio":
      return scene.cache.audio.exists(asset.key);
    case "tilemapTiledJSON":
      return scene.cache.tilemap.exists(asset.key);
    case "bitmapFont":
      return scene.cache.bitmapFont.exists(asset.key);
    case "json":
      return scene.cache.json.exists(asset.key);
    default:
      return false;
  }
}

export async function ensureSceneAssets(
  scene: Phaser.Scene,
  assets: AssetDescriptor[],
  onProgress?: (progress: number) => void
): Promise<void> {
  const pending = assets.filter((asset) => !isLoaded(scene, asset));
  if (pending.length === 0) {
    onProgress?.(1);
    return;
  }

  const loader = scene.load;

  return new Promise((resolve, reject) => {
    const progressHandler = (value: number) => onProgress?.(value);
    const handleComplete = () => {
      cleanup();
      resolve();
    };
    const handleError = (_file: Phaser.Loader.File, key: string) => {
      cleanup();
      reject(new Error(`Failed to load asset ${key}`));
    };

    const cleanup = () => {
      loader.off("progress", progressHandler);
      loader.off("loaderror", handleError);
      loader.off("complete", handleComplete);
    };

    loader.on("progress", progressHandler);
    loader.on("loaderror", handleError);
    loader.once("complete", handleComplete);

    for (const asset of pending) {
      switch (asset.type) {
        case "image":
          loader.image(asset.key, asset.url);
          break;
        case "spritesheet":
          loader.spritesheet(asset.key, asset.url, asset.frameConfig);
          break;
        case "audio":
          loader.audio(asset.key, asset.urls);
          break;
        case "tilemapTiledJSON":
          loader.tilemapTiledJSON(asset.key, asset.url);
          break;
        case "bitmapFont":
          loader.bitmapFont(asset.key, asset.textureURL, asset.atlasURL);
          break;
        case "json":
          loader.json(asset.key, asset.url);
          break;
        default:
          break;
      }
    }

    loader.start();
  });
}
