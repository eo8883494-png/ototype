// Remotion レンダリング設定。CLI(`remotion render`)とStudioの両方が読む。
import {Config} from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('jpeg'); // pngより高速(レンダリング時間短縮)
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p'); // TikTok/各プレイヤー互換
