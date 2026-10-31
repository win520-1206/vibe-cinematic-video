import {Config} from '@remotion/cli/config';
if(process.env.BROWSER_EXECUTABLE)Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
Config.setVideoImageFormat('png');
