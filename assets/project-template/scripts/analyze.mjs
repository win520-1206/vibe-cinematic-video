import path from 'node:path';
import {project,tool,run} from './common.mjs';
project();
const python=process.env.PYTHON||'python';
run(python,['-X','utf8',path.resolve('tools/prepare_audio.py'),'--project',path.resolve('project-contract.json'),'--ffmpeg',tool('ffmpeg')],{stdio:'inherit'});
